export const PREVIEW_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;700&family=Playfair+Display:wght@700;800&family=Roboto:wght@400;700&display=swap');
  body{margin:0;padding:0;background:#e8edf5;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:center;color:#334155;gap:0}
  .page-sep{width:794px;height:15px;background: #e8edf5;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}
  .page-sep::before{content:''}
  .page-sep::after{content:'';}
  .doc{width:794px;height:1122.5px;overflow:hidden;background:var(--doc-bg);padding:var(--doc-pad-top) var(--doc-pad-sides) var(--doc-pad-bot);box-sizing:border-box;border-radius:0}
  .p-text          { white-space: pre-wrap; margin-bottom: 0px; font-size: var(--fs); font-weight: var(--fw); text-align: var(--ta); text-decoration: var(--td); font-style: var(--fst); color: var(--color); font-family: var(--ff); line-height: var(--lh); letter-spacing: var(--ls); background: var(--bg); border-radius: var(--radius); padding: var(--pad); opacity: var(--opacity); }
  .p-field         { margin-bottom: 0px; display: flex; flex-direction: column; gap: 4px; }
  .p-input-wrap    { position: relative; width: 100%; display: flex; align-items: flex-end; gap: 8px; }
  .p-label         { font-size: var(--fs, 15px); font-weight: var(--fw, 500); color: #1e293b; margin: 0; white-space: nowrap; font-family: var(--ff, inherit); }
  .p-error {
    color: #F06548;
    font-size: 11px;
    font-weight: 700;
    margin-top: 4px;
    display: none;
    animation: asm-fade-in 0.2s ease-in-out;
  }
  @keyframes asm-fade-in { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
  .is-invalid ~ .p-error { display: block !important; }
  .p-input         { flex: 1; border: none !important; border-bottom: 1px solid #64748b !important; padding: 4px 8px !important; font-size: var(--fs, 15px) !important; font-weight: var(--fw, 400) !important; background: transparent !important; box-sizing: border-box; color: #0f172a !important; border-radius: 0 !important; height: auto !important; transition: background 0.2s; min-width: 100px; font-family: var(--ff, inherit); }
  .p-input:focus   { outline: none; box-shadow: none; }
  .p-textarea      { width: 100%; border: none; border-bottom: 1px solid #64748b; padding: 8px; font-size: 15px; background: #f5f8ff; box-sizing: border-box; color: #0f172a; resize: vertical; min-height: 40px; border-radius: 0; margin-top: 5px; }
  .p-date-wrapper  { position: relative; flex: 1; display: flex; align-items: flex-end; gap: 8px; }
  .p-date-icon     { display: none; }
  .p-date-input    { padding-left: 8px !important; }
  .p-cb-group      { display: flex; gap: 10px; margin-bottom: 0px; align-items: center; }
  .p-checkbox      { width: 18px; height: 18px; border: 1.5px solid #cbd5e1; border-radius: 4px; accent-color: #3b518d; cursor: pointer; }
  .p-cb-label      { font-size: var(--fs, 13.5px); color: #334155; font-weight: 500; }
  .p-sig-grid      { display: flex; flex-wrap: wrap; margin-top: 0px; }
  .p-sig-grid .p-field { margin-bottom: 0px !important; }
  .p-sig-box       { border: 1.5px solid #e2e8f0; border-radius: 12px; height: 85px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01); background: #fff; }
  .p-sig-drop      { background: #f8fafc; cursor: pointer; }
  .p-sig-icon      { font-size: 28px; color: #3b518d; opacity: 0.7; margin-bottom: 2px; }
  .p-sig-meta      { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .p-sig-meta-date { color: #94a3b8; }
  .p-sig-input     { width: 100% !important; border: none !important; background: transparent !important; text-align: center !important; font-size: 13px !important; font-weight: 600 !important; color: #334155 !important; padding: 4px 0 !important; outline: none !important; box-shadow: none !important; height: auto !important; min-height: 24px; cursor: pointer; }
  .p-logo-wrapper  { margin-bottom: 0px; text-align: var(--align); margin-top: var(--mt); margin-bottom: var(--mb); }
  .p-logo-img      { max-width: 100%; height: auto; object-fit: contain; width: var(--w); }
  .p-logo-ph       { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 20px; display: inline-flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 13px; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
  .p-logo-ph:hover { border-color: #6366f1; background: #f0f4ff; color: #6366f1; }
  .p-divider       { border: none; border-top: 1.5px solid #e2e8f0; margin: 0px; }
  .p-spacer        { opacity: 0.3; border-radius: 4px; margin: 0px; height: var(--h); }
  .p-parties-grid  { display: flex; flex-wrap: wrap; margin-top: 0px; }
  .p-party-col     { border: 1.5px solid #e2e8f0; border-radius: 4px; padding: 14px; min-height: 150px; background: #f8fafc; min-width: 0; }
  .p-party-label   { margin-bottom: 8px; color: var(--color); font-size: var(--fs); font-weight: var(--fw); font-family: var(--ff); text-align: var(--ta); text-transform: uppercase; letter-spacing: var(--ls, 0.08em); }
  .ab4-block-clip-window { position: relative; overflow: hidden; width: 100%; }

  .flatpickr-calendar { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border-radius: 12px; border: none; background: #fff; padding: 0; overflow: hidden; width: 315px !important; }
  .flatpickr-months { background: #3b518d; color: #fff; padding: 12px 0; }
  .flatpickr-current-month { color: #fff !important; font-weight: 800 !important; font-size: 1.1rem !important; }
  .flatpickr-current-month .flatpickr-monthDropdown-months { background: #3b518d; color: #fff; font-weight: 800; padding:0 5px }
  .flatpickr-months .flatpickr-prev-month, .flatpickr-months .flatpickr-next-month { color: #fff !important; fill: #fff !important; padding: 10px; }
  .flatpickr-months .flatpickr-prev-month:hover, .flatpickr-months .flatpickr-next-month:hover { background: rgba(255,255,255,0.1); border-radius: 5px; }
  .flatpickr-weekdays { background: #f8fafc; height: 36px; display: flex; align-items: center; border-bottom: 1px solid #f1f5f9 }
  .flatpickr-weekday { color: #3b518d !important; font-weight: 800 !important; font-size: 0.72rem !important; text-transform: uppercase; letter-spacing: 0.05em; }
  .flatpickr-days { border: none !important; padding: 10px !important; }
  .flatpickr-day { border-radius: 50% !important; margin: 2px; height: 38px; line-height: 38px; max-width: 38px; transition: all 0.2s; border: 1px solid transparent !important }
  .flatpickr-day.selected, .flatpickr-day.selected:hover { background: #f0f4ff !important; border-color: transparent !important; color: #3b518d !important; font-weight: 800; }
  .flatpickr-day.today { border-color: transparent !important; color: #334155 !important; font-weight: 800; text-decoration: underline; }
  .flatpickr-day:hover { background: #f1f5f9; border-color: transparent !important }
  .numInputWrapper span.arrowUp:after { border-bottom-color: #fff !important; }
  .numInputWrapper span.arrowDown:after { border-top-color: #fff !important; }
  @media print {
    @page { margin: 0; size: A4; }
    body { margin: 0; padding: 0 !important; background: #fff !important; display: block !important; }
    .page-sep { display: none !important; }
    .doc { 
      box-shadow: none !important; 
      width: 210mm !important; 
      height: 297mm !important;
      margin: 0 auto !important;
      padding: var(--doc-pad-top) var(--doc-pad-sides) var(--doc-pad-bot) !important; 
      border-radius: 0 !important; 
      page-break-after: always !important; 
      break-after: page !important; 
      box-sizing: border-box !important;
      background: var(--doc-bg) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow: hidden !important;
    }
    .doc:last-of-type { page-break-after: avoid !important; break-after: avoid !important; height: auto !important; min-height: auto !important; overflow: visible !important; }
  }
  .p-error {
    color: #F06548;
    font-size: 11px;
    font-weight: 600;
    margin-top: 4px;
    display: none;
    animation: asm-fade-in 0.3s ease;
  }
  @keyframes asm-fade-in { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
  .is-invalid + .p-error,
  .is-invalid ~ .p-error { display: block; }

  .is-invalid {
    box-shadow: none !important;
    border-color: #F06548 !important;
    background-color: #FFF0EE !important;
    animation: asm-shake 0.3s ease-in-out;
  }
  .p-sig-grid .p-field.is-invalid {
     border-radius: 12px;
     background-color: #FFF5F5 !important;
     padding: 10px;
  }
  .p-sig-grid .p-field.is-invalid .p-sig-box { border: none !important; background: transparent !important; }
  .p-error { display: none !important; }

  @keyframes asm-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }

  @media (max-width: 793px) {
    body { padding: 8px !important; background: #fff !important; }
    .page-sep { display: none !important; }
    .doc { 
      width: 100% !important; 
      height: auto !important; 
      min-height: auto !important; 
      padding: 15px !important; 
      box-shadow: none !important; 
      overflow: visible !important; 
    }
    .p-parties-grid, .p-sig-grid { display: block !important; }
    .p-logo-img { max-width: 100% !important; }
  }
`;

export const PREVIEW_JS = `
  var PAGE_H = 1122.5; // Approx 297mm at 96dpi minus a tiny margin for safety
  var originalHtml = null;

  window.validateDoc = function() {
    var form = document.querySelector('form') || document.getElementById('agreement-form');
    if (!form) {
       // Manual fallback if form wrapper is missing
       form = document.body;
    }

    var requiredFields = form.querySelectorAll('input[required], textarea[required], select[required]');
    var firstInvalid = null;
    var valid = true;

    for (var i = 0; i < requiredFields.length; i++) {
      var field = requiredFields[i];
      var val = field.value || '';
      var isEmpty = !val.trim();
      
      if (field.type === 'checkbox') {
        isEmpty = !field.checked;
      }
      
      if (isEmpty) {
        valid = false;
        field.classList.add('is-invalid');
        
        // Handle visible sibling (Flatpickr)
        if (field.classList.contains('flatpickr-input') && field.nextSibling && field.nextSibling.classList) {
           field.nextSibling.classList.add('is-invalid');
        }

        // Apply error to parent field container for full-block design
        var pField = field.closest('.p-field');
        if (pField) pField.classList.add('is-invalid');

        if (!firstInvalid) firstInvalid = field;
      } else {
        field.classList.remove('is-invalid');
        var pField = field.closest('.p-field');
        if (pField) pField.classList.remove('is-invalid');
        if (field.nextSibling && field.nextSibling.classList) {
           field.nextSibling.classList.remove('is-invalid');
        }
      }
    }

    if (firstInvalid) {
      if (typeof firstInvalid.focus === 'function') {
         try { firstInvalid.focus(); } catch(e) {}
      }
      var scrollTarget = firstInvalid.closest('.p-field') || firstInvalid;
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return { valid: valid };
  };

  function attachDropzone() {
    if (window.__dzAttached) return;
    window.__dzAttached = true;
    document.addEventListener('click', function(e) {
      var dropzone = e.target.closest('.preview-dropzone');
      if (dropzone) {
        var blockId = dropzone.getAttribute('data-block-id');
        if (blockId && window.parent && typeof window.parent.__openFmForBlock === 'function') {
          window.parent.__openFmForBlock(blockId);
          return;
        }

        var upld = document.getElementById('preview-upload');
        if (!upld) {
          upld = document.createElement('input');
          upld.type = 'file';
          upld.id = 'preview-upload';
          upld.style.display = 'none';
          upld.accept = 'image/*';
          document.body.appendChild(upld);
        }
        upld.click();
        upld.onchange = function(ev) {
          var file = ev.target.files[0];
          if (file) {
            var r = new FileReader();
            r.onload = function(rev) {
              var input = dropzone.querySelector('input');
              if (!input) {
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'p-input';
                input.style.position = 'absolute';
                input.style.left = '0';
                input.style.top = '0';
                input.style.width = '0';
                input.style.height = '0';
                input.style.opacity = '0';
                input.style.pointerEvents = 'none';
                dropzone.appendChild(input);
              }
              input.value = rev.target.result;

              var child = dropzone.firstChild;
              while (child) {
                var next = child.nextSibling;
                if (child !== input) {
                  dropzone.removeChild(child);
                }
                child = next;
              }

              var img = document.createElement('img');
              img.src = rev.target.result;
              img.style.maxHeight = '100%';
              img.style.maxWidth = '100%';
              img.style.borderRadius = '4px';
              dropzone.insertBefore(img, input);

              dropzone.style.border = 'none';
              dropzone.style.background = 'transparent';
              dropzone.style.padding = '0';

              var event = document.createEvent('HTMLEvents');
              event.initEvent('change', true, false);
              input.dispatchEvent(event);
            };
            r.readAsDataURL(file);
          }
        };
      }
    });
  }

  function reinitFlatpickr() {
    if (typeof flatpickr !== 'undefined') {
      flatpickr('.flatpickr', { dateFormat: 'd M, Y', allowInput: true, appendTo: document.body, disableMobile: true });
    }
  }

  function getSmartSplitHeight(el, maxHeight, clipTop) {
    var editor = el;
    if (!el.classList.contains('p-text') && !el.classList.contains('ab4-editor')) {
      editor = el.querySelector('.p-text') || el.querySelector('.ab4-editor') || el;
    }
    if (!editor) return maxHeight;

    var children = Array.from(editor.children);
    if (children.length === 0) {
      return maxHeight;
    }

    var parentRect = editor.getBoundingClientRect();
    var bestSplit = 0;
    var foundAny = false;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var childRect = child.getBoundingClientRect();
      var top = childRect.top - parentRect.top;
      var bottom = childRect.bottom - parentRect.top;

      var relTop = top - clipTop;
      var relBottom = bottom - clipTop;

      if (relBottom <= maxHeight) {
        bestSplit = Math.max(bestSplit, relBottom);
        foundAny = true;
      } else {
        if (relTop > 0 && relTop < maxHeight) {
          bestSplit = Math.max(bestSplit, relTop);
          foundAny = true;
        }
        break;
      }
    }

    if (foundAny && bestSplit >= 40) {
      return bestSplit;
    }
    return maxHeight;
  }

  function paginate() {
    var root = document.getElementById('doc-root');
    if (!root) return;

    var formWrapper = document.getElementById('agreement-form');
    if (!formWrapper) return;

    if (window.innerWidth < 794) {
      if (originalHtml) {
        formWrapper.innerHTML = originalHtml;
        originalHtml = null;
      }
      return;
    }

    // Backup or restore original un-paginated content before layout measurements
    if (!originalHtml) {
      originalHtml = formWrapper.innerHTML;
    } else {
      formWrapper.innerHTML = originalHtml;
      root = document.getElementById('doc-root');
    }

    var style = root.getAttribute('style') || '';
    var computed = window.getComputedStyle(root);
    var padTop = parseFloat(computed.paddingTop) || 0;
    var padBot = parseFloat(computed.paddingBottom) || 0;
    var usable = PAGE_H - padTop - padBot;

    var children = Array.from(root.children);
    var pages = [[]];
    var h = 0;       // height used on the current page
    var lastMb = 0;

    children.forEach(function(child) {
      if (child.id === 'preview-upload' || child.id === 'hidden-submit') return;

      if (child.classList.contains('p-page-break')) {
        pages[pages.length - 1].push({ element: child, clipTop: 0, clipHeight: 0, isSplit: false });
        pages.push([]);
        h = 0;
        lastMb = 0;
        return;
      }

      var childH = child.getBoundingClientRect().height;
      var cs = window.getComputedStyle(child);
      var mt = parseFloat(cs.marginTop) || 0;
      var mb = parseFloat(cs.marginBottom) || 0;

      var effectiveMt = pages[pages.length - 1].length === 0 ? mt : Math.max(lastMb, mt);
      var totalNeeded = effectiveMt + childH;

      if (h + totalNeeded <= usable) {
        // Fits entirely on current page
        h += totalNeeded;
        pages[pages.length - 1].push({ element: child, clipTop: 0, clipHeight: childH, isSplit: false });
        lastMb = mb;
      } else {
        var spaceLeft = usable - h - effectiveMt;
        if (childH > usable) {
          // Block is TALLER than a single page — slice it
          if (spaceLeft >= 40) {
            var firstSliceH = getSmartSplitHeight(child, spaceLeft, 0);
            pages[pages.length - 1].push({ element: child, clipTop: 0, clipHeight: firstSliceH, isSplit: true });
            var consumed = firstSliceH;
            var lastSliceH = firstSliceH;
            while (consumed < childH) {
              pages.push([]);
              var maxSliceH = Math.min(usable, childH - consumed);
              var sliceH = (consumed + maxSliceH < childH)
                ? getSmartSplitHeight(child, maxSliceH, consumed)
                : maxSliceH;
              pages[pages.length - 1].push({ element: child, clipTop: consumed, clipHeight: sliceH, isSplit: true });
              consumed += sliceH;
              lastSliceH = sliceH;
            }
            h = lastSliceH;
          } else {
            // Push completely to start fresh on next page
            pages.push([]);
            var consumed = 0;
            var lastSliceH = 0;
            while (consumed < childH) {
              if (consumed > 0) pages.push([]);
              var maxSliceH = Math.min(usable, childH - consumed);
              var sliceH = (consumed + maxSliceH < childH)
                ? getSmartSplitHeight(child, maxSliceH, consumed)
                : maxSliceH;
              pages[pages.length - 1].push({ element: child, clipTop: consumed, clipHeight: sliceH, isSplit: true });
              consumed += sliceH;
              lastSliceH = sliceH;
            }
            h = lastSliceH;
          }
        } else {
          // Fits on one page — push it entirely to next page
          pages.push([]);
          h = mt + childH;
          pages[pages.length - 1].push({ element: child, clipTop: 0, clipHeight: childH, isSplit: false });
        }
        lastMb = mb;
      }
    });

    if (pages.length <= 1 && pages[0].length > 0 && !pages[0].some(function(e) { return e.isSplit; })) {
      reinitFlatpickr();
      return;
    }

    formWrapper.innerHTML = '';

    pages.forEach(function(pageEntries, idx) {
      if (idx > 0) {
        var sep = document.createElement('div');
        sep.className = 'page-sep';
        formWrapper.appendChild(sep);
      }
      var page = document.createElement('div');
      page.className = 'doc';
      page.setAttribute('style', style);
      page.id = idx === 0 ? 'doc-root' : 'doc-page-' + (idx + 1);
      
      pageEntries.forEach(function(entry) {
        var cloned = entry.element.cloneNode(true);
        if (!entry.isSplit) {
          page.appendChild(cloned);
        } else {
          // Wrap sliced elements in a clip window structure
          var clipWin = document.createElement('div');
          clipWin.className = 'ab4-block-clip-window';
          clipWin.style.height = entry.clipHeight + 'px';
          clipWin.style.overflow = 'hidden';
          clipWin.style.position = 'relative';
          clipWin.style.width = '100%';

          var innerDiv = document.createElement('div');
          innerDiv.style.position = 'absolute';
          innerDiv.style.top = '-' + entry.clipTop + 'px';
          innerDiv.style.left = '0';
          innerDiv.style.right = '0';

          innerDiv.appendChild(cloned);
          clipWin.appendChild(innerDiv);
          page.appendChild(clipWin);
        }
      });
      formWrapper.appendChild(page);
    });

    // Add hidden submit button back for native reportValidity
    var btn = document.createElement('button');
    btn.type = 'submit'; btn.id = 'hidden-submit'; btn.style.display = 'none';
    formWrapper.appendChild(btn);

    reinitFlatpickr();
  }

  function attachImageLoadListeners() {
    var images = document.querySelectorAll('img');
    images.forEach(function(img) {
      if (!img.complete) {
        img.addEventListener('load', function() {
          paginate();
        });
      }
    });
  }

  function init() {
    if (typeof flatpickr !== 'undefined') {
      window.fp = flatpickr('.flatpickr', {
        dateFormat: 'd M, Y',
        allowInput: true,
        appendTo: document.body,
        disableMobile: true
      });
      paginate();
      attachImageLoadListeners();

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          paginate();
        });
      }
    } else {
      setTimeout(init, 100);
    }
  }

  attachDropzone();
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  window.extractFieldValues = function() {
    var form = document.querySelector('form') || document.getElementById('agreement-form') || document.body;
    var values = {};
    var fieldIndex = 0;
    var inputs = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < inputs.length; i++) {
      var field = inputs[i];
      if (field.id === 'preview-upload' || field.type === 'file' || field.type === 'hidden' || field.type === 'submit' || field.id === 'hidden-submit') continue;
      if (field.type === 'checkbox') {
        values['field_' + fieldIndex] = field.checked;
        fieldIndex++;
      } else if (field.classList.contains('p-sig-input') || field.classList.contains('flatpickr')) {
        values['field_' + fieldIndex] = field.value || '';
        fieldIndex++;
      } else if (field.type !== 'file' && window.getComputedStyle(field).display !== 'none') {
        values['field_' + fieldIndex] = field.value || '';
        fieldIndex++;
      }
    }
    return values;
  };
`;

/* ── HTML Generation Helper ──────────────────────────────────────────────── */
export const gen = (b: any) => {
  if (b.type === 'text') {
    const vars = `--bg:${b.bgColor || 'transparent'};--radius:${b.borderRadius || 0}px;--pad:${b.padding || 0}px;--opacity:${b.bgOpacity || 1};--fs:${b.fontSize || 14}px;--fw:${b.fontWeight || 400};--ta:${b.textAlign || 'left'};--td:${b.textDecoration || 'none'};--fst:${b.fontStyle || 'normal'};--color:${b.color || '#334155'};--ff:${b.fontFamily || 'Inter'};--lh:${b.lineHeight || 1.75};--ls:${b.letterSpacing || 0}px`;
    return `<div class="p-text" style="${vars};margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px">${b.content || ''}</div>`;
  }
  if (b.type === 'logo') {
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;
    return `<div class="p-logo-wrapper" style="--align:${b.logoAlign || 'center'};${styleStr}">
      <div class="preview-dropzone" data-block-id="${b.id}" style="display:inline-block; cursor:pointer; width:${b.logoFullWidth ? '100%' : 'auto'};">
        ${b.logoSrc ? `<img src="${b.logoSrc}" class="p-logo-img" style="--w:${b.logoFullWidth ? '100%' : `${b.logoWidth || 150}px`}"/>` : `<div class="p-logo-ph"><i class="ri-image-line"></i>IMAGE LOGO</div>`}
      </div>
    </div>`;
  }
  if (b.type === 'divider') {
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;
    return `<div class="p-divider" style="${styleStr}"></div>`;
  }
  if (b.type === 'page-break') {
    return `<div class="p-page-break" style="break-before: page; page-break-before: always; height: 0; margin: 0; padding: 0;"></div>`;
  }
  if (b.type === 'spacer') {
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;
    return `<div class="p-spacer" style="--h:${b.spacerHeight || 20}px;${styleStr}"></div>`;
  }
  if (b.type === 'input' || b.type === 'textarea' || b.type === 'date' || b.type === 'checkbox' || b.type === 'signature') {
    const isCb = b.type === 'checkbox';
    const fallbackFs = isCb ? 13.5 : 15;
    const vars = `--fs:${b.fontSize || fallbackFs}px;--fw:${b.fontWeight || 400};--ta:${b.textAlign || 'left'};--color:${b.color || '#0f172a'};--ff:${b.fontFamily || 'inherit'}`;
    const req = b.fieldRequired ? 'required' : '';
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;

    if (b.type === 'input') return `<div class="p-field" style="${vars};${styleStr}"><div class="p-input-wrap"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><input type="text" placeholder="${b.fieldPlaceholder || ''}" class="p-input" ${req}/></div></div>`;
    if (b.type === 'textarea') return `<div class="p-field" style="${vars};${styleStr}"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><textarea rows="1" class="p-textarea" placeholder="${b.fieldPlaceholder || ''}" style="font-size:var(--fs);font-weight:var(--fw);color:var(--color);font-family:var(--ff);" ${req}></textarea></div>`;
    if (b.type === 'date') return `<div class="p-field" style="${vars};${styleStr}"><div class="p-input-wrap"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><input type="text" class="form-control flatpickr p-input p-date-input" placeholder="Select Date" ${req}/></div></div>`;
    if (b.type === 'checkbox') return `<div class="p-field" style="${styleStr}"><div class="p-cb-group" style="${vars};justify-content:${b.textAlign === 'center' ? 'center' : b.textAlign === 'right' ? 'flex-end' : 'flex-start'}"><input type="checkbox" class="p-checkbox" ${req}/><label class="p-cb-label" style="font-size:var(--fs);font-weight:var(--fw);color:var(--color);font-family:var(--ff);">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}</label></div></div>`;
    if (b.type === 'signature') return `<div class="row p-sig-grid" style="${vars};${styleStr}">
      <div class="col-md-6 mb-3 mb-md-0">
        <div class="p-field">
          <div class="p-sig-box p-sig-drop preview-dropzone" data-block-id="${b.id}">
            ${b.logoSrc ? `<img src="${b.logoSrc}" style="max-height:45px;">` : `<i class="ri-quill-pen-line p-sig-icon"></i>`}
            <div class="p-sig-meta" style="font-size:calc(var(--fs) * 0.7);font-family:var(--ff);">${b.fieldLabel || 'SIGNATURE'}${b.fieldRequired ? ' *' : ''}</div>
            <input type="text" class="p-input" ${req} value="${b.logoSrc || ''}" style="position:absolute;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;"/>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-field">
          <div class="p-sig-box">
             <input type="text" class="form-control flatpickr p-sig-input" placeholder="Click here" style="font-size:var(--fs);font-weight:var(--fw);color:var(--color);font-family:var(--ff);text-align:center;border-bottom:1px solid #64748b; background:transparent;" ${req}/>
             <div class="p-sig-meta p-sig-meta-date">Signature Date</div>
          </div>
        </div>
      </div>
    </div>`;
  }
  if (b.type === 'parties') {
    const partyAContent = (b.partyA || []).map(gen).join('');
    const partyBContent = (b.partyB || []).map(gen).join('');
    const vars = `--color:${b.partyLabelColor || '#6366f1'};--fs:${b.partyLabelSize || 10}px;--fw:${b.partyLabelWeight || 800};--ff:${b.partyLabelFamily || 'inherit'};--ta:${b.partyLabelAlign || 'left'};--lh:${b.partyLabelLineHeight || 1.2};--ls:${b.partyLabelSpacing || 0.5}px`;
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;`;
    const colBg = (b.bgColor && b.bgColor !== 'transparent') ? b.bgColor : '#f8fafc';
    const colStyleStr = `background-color:${colBg};padding:${b.padding || 14}px;border-radius:${b.borderRadius || 4}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;
    return `<div class="row p-parties-grid" style="${styleStr}">
      <div class="col-md-6 mb-3 mb-md-0">
        <div class="p-party-col" style="${colStyleStr}; height:100%;">
          <div class="p-party-label" style="${vars}">${b.partyALabel || 'Party A'}</div>
          ${partyAContent}
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-party-col" style="${colStyleStr}; height:100%;">
          <div class="p-party-label" style="${vars}">${b.partyBLabel || 'Party B'}</div>
          ${partyBContent}
        </div>
      </div>
    </div>`;
  }
  return '';
};

export const getAgreementHtml = (blocks: any, { pagePad, docBg }: { pagePad?: number, docBg?: string } = {}) => `<!DOCTYPE html><html lang="en">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.8.0/fonts/remixicon.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <style>
    :root { --doc-bg: ${docBg || '#ffffff'}; --doc-pad: ${pagePad || 80}px; --doc-pad-top: ${Math.round((pagePad || 80) * 0.9)}px; --doc-pad-sides: ${pagePad || 80}px; --doc-pad-bot: ${pagePad || 80}px; }
    ${PREVIEW_CSS}
  </style>
</head>
<body>
  <form id="agreement-form">
    <div class="doc" id="doc-root">${(blocks || []).map(gen).join('')}</div>
    <button type="submit" id="hidden-submit" style="display:none"></button>
  </form>
  <input type="file" id="preview-upload" style="display:none" accept="image/*">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script>${PREVIEW_JS}</script>
</body></html>`;

/* ── ID helper ───────────────────────────────────────────────────────────── */
let _uid = Date.now();
export const uid = () => `b${_uid++}`;

/* ── Palette ─────────────────────────────────────────────────────────────── */
export const PALETTE = [
  {
    group: 'Layout', icon: 'ri-layout-line', items: [
      { type: 'logo', label: 'Company Logo', icon: 'ri-image-line' },
      { type: 'divider', label: 'Divider', icon: 'ri-separator' },
      { type: 'spacer', label: 'Spacer', icon: 'ri-space' },
      { type: 'page-break', label: 'Page Break', icon: 'ri-scissors-cut-line' },
      { type: 'parties', label: 'Parties Row', icon: 'ri-group-line' },
    ]
  },
  {
    group: 'Text', icon: 'ri-text', items: [
      { type: 'text', label: 'Text Block', icon: 'ri-text' },
    ]
  },
  {
    group: 'Fields', icon: 'ri-form-line', items: [
      { type: 'input', label: 'Text Field', icon: 'ri-input-method-line' },
      { type: 'date', label: 'Date', icon: 'ri-calendar-line' },
      { type: 'checkbox', label: 'Checkbox', icon: 'ri-checkbox-line' },
      { type: 'signature', label: 'Signature', icon: 'ri-pen-nib-line' },
    ]
  },
];

export const PALETTE_FLAT = () => PALETTE.flatMap(g => g.items);
export const FIELD_TYPES = new Set(['input', 'textarea', 'date', 'checkbox', 'signature']);
export const FIELD_DEF = {
  input: 'Full Name', textarea: 'Additional Notes', date: 'Date',
  checkbox: 'I agree to terms...', signature: 'Authorized Signature',
};

/* ── Text style defaults ─────────────────────────────────────────────────── */
export const TEXT_DEFAULTS = {
  fontSize: 14, fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, sans-serif',
  textAlign: 'left', color: '#334155', lineHeight: 1.75, letterSpacing: 0, textTransform: 'none', textDecoration: 'none',
  marginTop: 0, marginBottom: 15,
};

export const makeBlock = (paletteType: string) => ({
  id: uid(),
  type: paletteType === 'text' ? 'text' : paletteType,
  paletteType,
  content: paletteType === 'text' ? 'Enter text here...' : '',
  ...TEXT_DEFAULTS,
  // parties
  partyALabel: 'Party A', partyBLabel: 'Party B',
  partyLabelColor: '#6366f1', partyLabelSize: 10, partyLabelWeight: '800', partyLabelFamily: 'Inter, sans-serif',
  partyLabelAlign: 'left', partyLabelTransform: 'uppercase', partyLabelDecoration: 'none', partyLabelLineHeight: 1.2, partyLabelSpacing: 0.5,
  partyA: [{ id: uid(), type: 'text', content: 'Party A Name Editor...', ...TEXT_DEFAULTS }],
  partyB: [{ id: uid(), type: 'text', content: 'Party B Name Editor...', ...TEXT_DEFAULTS }],
  // logo
  logoSrc: null, logoAlign: 'left', logoWidth: 180, logoFullWidth: false,
  // fields
  fieldLabel: (FIELD_DEF as any)[paletteType] || '', fieldRequired: false, fieldPlaceholder: '', spacerHeight: 32,
  // background/extra
  bgColor: 'transparent', bgOpacity: 1, borderRadius: 0, padding: 0,
});

/* ── Demo Template ────────────────────────────────────────────────────────── */
export const getDemoTemplate = () => [
  { ...makeBlock('logo'), logoAlign: 'center', marginBottom: 20 },
  { ...makeBlock('text'), content: 'MASTER LOAN AGREEMENT', textAlign: 'center', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  { ...makeBlock('text'), content: 'Document Ref: #FCH-' + Math.floor(Math.random() * 9000 + 1000), textAlign: 'center', fontSize: 10, color: '#94a3b8', marginBottom: 30 },
  { ...makeBlock('divider') },
  { ...makeBlock('text'), content: 'This LOAN AGREEMENT (the "Agreement") is made and effective as of this date, by and between the Lender and the Borrower as identified below. Collectively, the "Parties" hereby agree to be bound by the following terms and conditions:', textAlign: 'justify', fontSize: 13, lineHeight: 1.8, marginBottom: 30 },
  {
    ...makeBlock('parties'),
    partyALabel: 'THE LENDER', partyBLabel: 'THE BORROWER',
    partyLabelColor: '#1e293b',
    partyA: [
      { ...makeBlock('text'), content: 'Fintech Solutions Limited', fontWeight: '700', fontSize: 13, marginBottom: 4 },
      { ...makeBlock('text'), content: 'Corporate Headquarters\n101 Venture Way, Innovation Park\nSilicon Valley, CA 94025\nEmail: settlements@fintech.com', fontSize: 11, color: '#64748b' }
    ],
    partyB: [
      { ...makeBlock('text'), content: '[Customer Full Name]', fontWeight: '700', fontSize: 13, marginBottom: 4 },
      { ...makeBlock('text'), content: '[Registered Permanent Address]\n[State, Country, Zip Code]\n[Tax Identification Number]\n[Primary Contact Number]', fontSize: 11, color: '#64748b' }
    ]
  },
  { ...makeBlock('spacer'), spacerHeight: 40 },
  { ...makeBlock('text'), content: '1. PRINCIPAL LOAN AMOUNT', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  { ...makeBlock('text'), content: 'The Lender agrees to provide a principal sum of [Total Amount in figures and words] to the Borrower. These funds shall be disbursed upon the successful execution and notarization of this agreement, subject to the conditions precedent listed in Section 5.', fontSize: 12, marginBottom: 25 },
  { ...makeBlock('text'), content: '2. INTEREST AND CHARGES', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  { ...makeBlock('text'), content: '• Annual Percentage Rate (APR): [Rate]%\n• Compounding Period: Monthly\n• Late Payment Fee: [Amount] per day of delinquency', fontSize: 12, marginBottom: 25 },
  { ...makeBlock('text'), content: '3. REPAYMENT SCHEDULE', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  { ...makeBlock('text'), content: 'The Borrower agrees to repay the Principal plus accrued interest in [Number] equal monthly installments. The first payment is due exactly thirty (30) days from the date of disbursement.', fontSize: 12, marginBottom: 25 },
  { ...makeBlock('text'), content: '4. GOVERNING LAW & JURISDICTION', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  { ...makeBlock('text'), content: 'This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflicts of law principles. Any legal action arising hereunder shall be filed in the courts residing in the County of Santa Clara.', fontSize: 11, fontStyle: 'italic', color: '#64748b', marginBottom: 40 },
  { ...makeBlock('divider') },
  { ...makeBlock('signature'), fieldLabel: 'AUTHORIZED SIGNER' },
];

export const COLOR_SWATCHES = [
  '#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8',
  '#dc2626', '#ea580c', '#d97706', '#fbbf24', '#16a34a', '#059669',
  '#0284c7', '#2563eb', '#6366f1', '#7c3aed', '#8b5cf6', '#a855f7',
  '#db2777', '#ec4899', '#f43f5e', '#ffffff', 'transparent'
];
