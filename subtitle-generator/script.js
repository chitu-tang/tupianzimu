document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const dropZone = document.getElementById('dropZone');
    const btnPick = document.getElementById('btnPick');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    // Inputs
    const inputFontSize = document.getElementById('fontSize');
    const inputLineHeight = document.getElementById('lineHeight');
    const inputFontColor = document.getElementById('fontColor');
    const inputFontColorText = document.getElementById('fontColorText');
    const inputStrokeColor = document.getElementById('strokeColor');
    const inputStrokeColorText = document.getElementById('strokeColorText');
    const inputStrokeWidth = document.getElementById('strokeWidth');
    const inputBgColor = document.getElementById('bgColor');
    const inputBgColorText = document.getElementById('bgColorText');
    const inputOpacity = document.getElementById('bgOpacity');
    const opacityValue = document.getElementById('opacityValue');
    const inputPadding = document.getElementById('padding');
    const paddingValue = document.getElementById('paddingValue');
    const inputGap = document.getElementById('gap');
    const gapValue = document.getElementById('gapValue');
    const inputBottomPad = document.getElementById('bottomPad');
    const bottomPadValue = document.getElementById('bottomPadValue');
    const showSeparator = document.getElementById('showSeparator');
    const inputSeparatorWidth = document.getElementById('separatorWidth');
    const inputSeparatorColor = document.getElementById('separatorColor');
    const inputSeparatorColorText = document.getElementById('separatorColorText');
    const inputText = document.getElementById('subtitleText');
    
    // Buttons
    const btnGenerate = document.getElementById('btnGenerate');
    const btnSave = document.getElementById('btnSave');

    // State
    let state = {
        image: null,
        imgName: 'subtitle_image',
        config: {
            fontSize: 40,
            lineHeight: 50,
            fontColor: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 3,
            bgColor: '#000000',
            bgOpacity: 0.7,
            paddingX: 20,
            gap: 2,
            bottomPad: 0,
            showSeparator: false,
            separatorWidth: 1,
            separatorColor: '#000000',
            text: ''
        }
    };

    const LINE_GAP = 2;

    // Init
    function init() {
        bindEvents();
        inputText.value = "别吵\n我在给自己写钓鱼网站呢\n对，这年头\n咱们猫咪都能自己写代码了";
        updateConfig(); // Load initial values
    }

    function bindEvents() {
        // File Upload (button)
        btnPick.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFiles);
        // Drag & Drop
        ;['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragging');
        }));
        ;['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragging');
        }));
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                fileInput.files = files;
                handleFiles();
            }
        });
        
        // Config Changes
        const inputs = [inputFontSize, inputLineHeight, inputStrokeWidth, inputBgColorText, inputText, inputOpacity, inputPadding, inputGap, inputBottomPad, inputSeparatorWidth, inputSeparatorColorText, showSeparator];
        inputs.forEach(el => el.addEventListener('input', () => {
            updateConfig();
            draw();
        }));
        opacityValue.textContent = inputOpacity.value;
        paddingValue.textContent = `${inputPadding.value}px`;
        gapValue.textContent = `${inputGap.value}px`;
        bottomPadValue.textContent = `${inputBottomPad.value}px`;

        // Color Sync (Picker <-> Text)
        syncColorInputs(inputFontColor, inputFontColorText, 'fontColor');
        syncColorInputs(inputStrokeColor, inputStrokeColorText, 'strokeColor');
        syncColorInputs(inputBgColor, inputBgColorText, 'bgColor');
        syncColorInputs(inputSeparatorColor, inputSeparatorColorText, 'separatorColor');

        // Actions
        btnGenerate.addEventListener('click', downloadImage);
        btnSave.addEventListener('click', downloadImage); 
    }

    function syncColorInputs(picker, text, configKey) {
        picker.addEventListener('input', () => {
            text.value = picker.value;
            updateConfig();
            draw();
        });
        text.addEventListener('input', () => {
            picker.value = text.value;
            updateConfig();
            draw();
        });
    }

    function handleFiles() {
        const file = fileInput.files[0];
        if (!file) return;

        fileNameDisplay.textContent = file.name;
        state.imgName = file.name.replace(/\.[^/.]+$/, "");

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                state.image = img;
                previewPlaceholder.style.display = 'none';
                canvas.style.display = 'block';
                btnSave.disabled = false;
                draw();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateConfig() {
        state.config.fontSize = parseInt(inputFontSize.value) || 20;
        state.config.lineHeight = parseInt(inputLineHeight.value) || (state.config.fontSize + 10);
        state.config.fontColor = inputFontColorText.value;
        state.config.strokeColor = inputStrokeColorText.value;
        state.config.strokeWidth = parseFloat(inputStrokeWidth.value) || 2;
        state.config.bgColor = inputBgColorText.value;
        state.config.bgOpacity = parseFloat(inputOpacity.value) || 0.7;
        opacityValue.textContent = String(state.config.bgOpacity);
        state.config.paddingX = parseInt(inputPadding.value) || 0;
        paddingValue.textContent = `${state.config.paddingX}px`;
        state.config.gap = parseInt(inputGap.value) || 0;
        gapValue.textContent = `${state.config.gap}px`;
        state.config.bottomPad = parseInt(inputBottomPad.value) || 0;
        bottomPadValue.textContent = `${state.config.bottomPad}px`;
        state.config.showSeparator = !!showSeparator.checked;
        state.config.separatorWidth = parseInt(inputSeparatorWidth.value) || 1;
        state.config.separatorColor = inputSeparatorColorText.value;
        state.config.text = inputText.value;
    }

    function draw() {
        if (!state.image) return;

        // Compute total canvas height: image + stacked lines below (except first line which is inside image)
        const W = state.image.width;
        const H = state.image.height;
        const lines = state.config.text.split('\n');
        const n = lines.length;
        const LH = state.config.lineHeight;
        const GAP = state.config.gap;
        // Extra height: we add GAP before the second line to keep the same cutting feel as other lines
        const extra = n <= 1 ? 0 : ((n - 1) * (LH + GAP) + GAP);

        canvas.width = W;
        canvas.height = H + extra;

        // Draw original image
        ctx.drawImage(state.image, 0, 0);
        
        // Style setup
        const fontSize = state.config.fontSize;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lineHeight = state.config.lineHeight;
        const bottomPad = state.config.bottomPad;
        const padding = state.config.paddingX;

        // Prepare first-line strip by cloning original image region + overlay color, for pixel-identical replication
        const y0Raw = H - lineHeight - bottomPad;
        const y0 = Math.max(0, Math.min(H - lineHeight, y0Raw));
        const stripCanvas = document.createElement('canvas');
        stripCanvas.width = W;
        stripCanvas.height = lineHeight;
        const stripCtx = stripCanvas.getContext('2d');
        if (y0 >= 0 && y0 + lineHeight <= H) {
            stripCtx.drawImage(state.image, 0, y0, W, lineHeight, 0, 0, W, lineHeight);
        }
        const rgbaFirst = toRgba(state.config.bgColor, state.config.bgOpacity);
        stripCtx.fillStyle = rgbaFirst;
        stripCtx.fillRect(0, 0, W, lineHeight);

        lines.forEach((line, index) => {
            const isFirst = index === 0;
            const y = isFirst ? y0Raw : (H + GAP + (index - 1) * (lineHeight + GAP));

            // Draw cloned strip to ensure perfect consistency
            ctx.drawImage(stripCanvas, 0, y, W, lineHeight);

            // Optional separator line under each strip (except maybe last if desired)
            if (state.config.showSeparator) {
                ctx.fillStyle = state.config.separatorColor;
                ctx.fillRect(0, y + lineHeight, W, state.config.separatorWidth);
            }

            // Draw Text
            if (line.trim() !== '') {
                const textX = canvas.width / 2;
                const textY = y + lineHeight / 2; // Vertical center of the strip
                
                // Stroke
                ctx.strokeStyle = state.config.strokeColor;
                ctx.lineWidth = Math.max(1, state.config.strokeWidth);
                ctx.lineJoin = 'round';
                ctx.strokeText(line, textX, textY);
                
                // Fill
                ctx.fillStyle = state.config.fontColor;
                ctx.fillText(line, textX, textY);
            }
        });
    }

    function toRgba(hexOrColor, alpha) {
        // Accept hex like #000 or #000000, or already rgba
        if (/^rgba?\(/i.test(hexOrColor)) {
            const rgb = hexOrColor.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (rgb) {
                return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
            }
        }
        const hex = hexOrColor.replace('#','');
        let r,g,b;
        if (hex.length === 3) {
            r = parseInt(hex[0]+hex[0], 16);
            g = parseInt(hex[1]+hex[1], 16);
            b = parseInt(hex[2]+hex[2], 16);
        } else {
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function downloadImage() {
        if (!state.image) {
            alert('请先上传图片');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `${state.imgName}_subtitle.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    init();
});
