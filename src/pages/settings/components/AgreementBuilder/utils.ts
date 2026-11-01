import { AGREEMENT_MERGE_FIELDS } from '../../../../config/agreementMergeFields';
import { measureLineBoxes, planPages } from './pagination';

/**
 * Letterhead and signing line, shared by the builder's canvas and the saved
 * template so both look the same. Laid out as tables (not grid or flex) so the
 * server's PDF renderer draws them too.
 */
export const LAYOUT_CSS = `
  .p-letterhead { display: table; width: 100%; table-layout: fixed; border-bottom: 2px solid #0f172a; }
  .p-letterhead-logo, .p-letterhead-info { display: table-cell; vertical-align: middle; padding-bottom: 16px; }
  .p-letterhead-img { display: block; max-width: 100%; height: auto; }
  .p-letterhead-info { font-size: var(--fs, 11px); font-weight: var(--fw, 400); text-align: var(--ta, right); color: var(--color, #64748b); font-family: var(--ff, 'Inter'), sans-serif; line-height: var(--lh, 1.65); white-space: pre-wrap; }
  .p-letterhead-name { font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: 0.01em; margin-bottom: 2px; }
  .p-sign-card { border: 1px solid #dbe3ef; border-top: 3px solid #2a5fc1; border-radius: 4px; padding: 14px 20px 0; background: #fff; box-shadow: 0 6px 18px -10px rgba(15, 23, 42, 0.25); page-break-inside: avoid; break-inside: avoid; }
  .p-sign-head { padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #eef2f7; font-family: 'Inter', sans-serif; font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0f172a; }
  .p-sign-head i { display: inline-block; width: 24px; height: 24px; line-height: 24px; margin-right: 8px; text-align: center; border-radius: 4px; background: #e8eefa; color: #2a5fc1; font-size: 13px; letter-spacing: 0; vertical-align: middle; }
  .p-sign-col:not(.p-sign-col--date) .p-sign-pad { background: #f8fafc; border-radius: 4px 4px 0 0; }
  .p-sign-foot { margin: 14px -20px 0; padding: 8px 20px; border-top: 1px solid #eef2f7; background: #fbfcfe; border-radius: 0 0 4px 4px; font-family: 'Inter', sans-serif; font-size: 10.5px; color: #64748b; }
  .p-sign-foot i { margin-right: 5px; color: #16a34a; }
  .p-sign { display: table; width: 100%; table-layout: fixed; }
  .p-sign > .p-field { display: table-cell; vertical-align: top; width: 58%; margin: 0; }
  .p-sign > .p-sign-gap { display: table-cell; width: 6%; }
  .p-sign > .p-sign-col--date { width: 36%; }
  .p-sign-pad { position: relative; height: 80px; display: flex; align-items: flex-end; padding: 0 0 8px 24px; box-sizing: border-box; }
  .p-sign-col--date .p-sign-pad { padding-left: 2px; }
  .p-sign-x { position: absolute; left: 2px; bottom: 7px; font-size: 18px; line-height: 1; color: #94a3b8; font-family: 'Inter', sans-serif; }
  .p-sign-tag { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 22px 0 12px; background: #fde68a; color: #78350f; font-size: 12px; font-weight: 700; letter-spacing: 0.02em; font-family: 'Inter', sans-serif; border-radius: 4px 0 0 4px; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%); cursor: pointer; transition: background 0.15s; }
  .p-sign-tag:hover { background: #fcd34d; }
  .p-sign-img { max-height: 64px; max-width: 100%; object-fit: contain; }
  .p-sign-rule { border-top: 1px solid #334155; }
  .p-sign-name { margin-top: 8px; font-size: 13.5px; font-weight: 600; color: #0f172a; font-family: var(--ff, 'Inter'), sans-serif; }
  .p-sign-caption { margin-top: 2px; font-size: 11px; color: #64748b; font-family: 'Inter', sans-serif; }
  .p-sign-col--date .p-sign-caption { margin-top: 8px; }
  .p-sign .p-sign-date { width: 100% !important; border: 0 !important; background: transparent !important; box-shadow: none !important; outline: none !important; padding: 0 !important; height: auto !important; min-height: 0; font-size: 14px !important; font-weight: 600 !important; color: #0f172a !important; text-align: left !important; cursor: pointer; font-family: var(--ff, 'Inter'), sans-serif; }
  .p-sign .p-sign-date::placeholder { color: #94a3b8; font-weight: 500; }
  .p-sign .p-field.is-invalid { background: transparent !important; padding: 0 !important; animation: none; }
  .p-sign .p-field.is-invalid .p-sign-tag { background: #fecaca; color: #991b1b; }
  .p-sign .p-field.is-invalid .p-sign-rule { border-top-color: #ef4444; }
  @media (max-width: 793px) {
    html:not(.force-desktop) .p-sign, html:not(.force-desktop) .p-sign > .p-field { display: block; width: 100%; }
    html:not(.force-desktop) .p-sign > .p-sign-gap { display: none; }
    html:not(.force-desktop) .p-sign > .p-sign-col--date { margin-top: 18px; }
    html:not(.force-desktop) .p-sign-card { padding: 12px 14px 14px; }
    html:not(.force-desktop) .p-letterhead, html:not(.force-desktop) .p-letterhead > div { display: block; text-align: left; }
  }
`;

export const PREVIEW_CSS = `${LAYOUT_CSS}
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;700&family=Playfair+Display:wght@700;800&family=Roboto:wght@400;700&display=swap');
  body{margin:0;padding:0;background:#e8edf5;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:center;color:#334155;gap:0}
  .page-sep{width:794px;height:15px;background: #e8edf5;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}
  .page-sep::before{content:''}
  .page-sep::after{content:'';}
  .doc{width:794px;height:1122.5px;overflow:hidden;background:var(--doc-bg);padding:var(--doc-pad-top) var(--doc-pad-sides) var(--doc-pad-bot);box-sizing:border-box;border-radius:0}
  .p-text          { white-space: pre-wrap; margin-bottom: 0px; font-size: var(--fs); font-weight: var(--fw); text-align: var(--ta); text-decoration: var(--td); font-style: var(--fst); color: var(--color); font-family: var(--ff); line-height: var(--lh); letter-spacing: var(--ls); background: var(--bg); border-radius: var(--radius); padding: var(--pad); opacity: var(--opacity); }
  .p-text ul, .p-text ol { margin: 0 0 4px; padding-left: 1.4em; }
  .p-text li { margin: 2px 0; }
  .p-text table { width: 100%; border-collapse: collapse; margin: 4px 0; white-space: normal; font-size: inherit; }
  .p-text th, .p-text td { border: 1px solid #cbd5e1; padding: 6px 9px; text-align: left; vertical-align: top; word-break: normal; overflow-wrap: break-word; }
  .p-text tr > :first-child:nth-last-child(2) { width: 30%; }
  .p-text tr > :first-child:nth-last-child(3) { width: 30%; }
  .p-text th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
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
    html, body, .ab4-root { height: auto !important; min-height: auto !important; }
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
    .ab4-parties, .ab4-sig {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .p-party-col, .ab4-party { height: auto !important; }
    .ab4-field, .p-field, .p-input-wrap, .p-date-wrapper {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .p-logo-img { max-width: 100% !important; }
  }

  /* Force desktop view for pagination right before submission */
  html.force-desktop, html.force-desktop body {
    width: 794px !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #e8edf5 !important;
  }
  html.force-desktop .page-sep {
    display: flex !important;
  }
  html.force-desktop .doc { 
    width: 794px !important; 
    height: 1122.5px !important; 
    min-height: 1122.5px !important; 
    padding: var(--doc-pad-top) var(--doc-pad-sides) var(--doc-pad-bot) !important; 
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important; 
    overflow: hidden !important; 
  }
  html.force-desktop .p-parties-grid, html.force-desktop .p-sig-grid {
    display: flex !important;
  }
  html.force-desktop .ab4-parties, html.force-desktop .ab4-sig {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
  }
  html.force-desktop .p-party-col, html.force-desktop .ab4-party {
    height: 100% !important;
  }
  html.force-desktop .col-md-6 {
    width: 50% !important;
    margin-bottom: 0 !important;
  }
`;

export const PREVIEW_JS = `
  var planPages = ${planPages.toString()};
  var measureLineBoxes = ${measureLineBoxes.toString()};
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

  function paginate() {
    var root = document.getElementById('doc-root');
    if (!root) return;

    var formWrapper = document.getElementById('agreement-form');
    if (!formWrapper) return;

    if (window.innerWidth < 794 && !document.documentElement.classList.contains('force-desktop')) {
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
    var els = [];
    var items = [];
    children.forEach(function(child) {
      if (child.id === 'preview-upload' || child.id === 'hidden-submit') return;
      els.push(child);
      if (child.classList.contains('p-page-break')) {
        items.push({ height: 0, marginTop: 0, marginBottom: 0, boxes: null, pageBreak: true });
        return;
      }
      var cs = window.getComputedStyle(child);
      items.push({
        height: child.getBoundingClientRect().height,
        marginTop: parseFloat(cs.marginTop) || 0,
        marginBottom: parseFloat(cs.marginBottom) || 0,
        boxes: measureLineBoxes(child),
        keepWithNext: child.getAttribute('data-keep') === '1'
      });
    });
    var pages = planPages(items, usable).map(function(page) {
      return page.map(function(slot) {
        return { element: els[slot.index], clipTop: slot.clipTop, clipHeight: slot.clipHeight, isSplit: slot.isSplit, marginBottom: items[slot.index].marginBottom };
      });
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
      
      pageEntries.forEach(function(entry, entryIdx) {
        var cloned = entry.element.cloneNode(true);
        if (!entry.isSplit) {
          // A page's first block starts at the top: its top margin was not counted.
          if (entryIdx === 0) cloned.style.marginTop = '0';
          page.appendChild(cloned);
        } else {
          // Wrap sliced elements in a clip window structure
          var clipWin = document.createElement('div');
          clipWin.className = 'ab4-block-clip-window';
          clipWin.style.height = entry.clipHeight + 'px';
          clipWin.style.overflow = 'hidden';
          clipWin.style.position = 'relative';
          clipWin.style.width = '100%';
          clipWin.style.marginBottom = entry.marginBottom + 'px';
          cloned.style.marginTop = '0';
          cloned.style.marginBottom = '0';

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
/** A heading, or a short bold line (how older templates write section titles), stays with the text after it. */
export const keepsWithNext = (b: { type?: string; paletteType?: string; content?: string; fontWeight?: string | number }): boolean => {
  if (b.type !== 'text') return false;
  if (b.paletteType === 'heading') return true;
  if (b.paletteType && b.paletteType !== 'text') return false;
  const content = b.content || '';
  return Number(b.fontWeight) >= 700 && content.length <= 120 && !content.includes('<') && !content.includes('\n');
};

/** What a new Header block says on its right: the company's details, as merge fields. */
export const HEADER_CONTENT = '<div class="p-letterhead-name">{{owner.company_name}}</div><div>{{owner.address}}</div><div>{{owner.email}} &nbsp;&middot;&nbsp; {{owner.phone}}</div>';

/** The Header block: the logo on the left, its own text on the right, a rule under both. */
const letterhead = (b: any, styleStr: string) => {
  const textVars = `--fs:${b.fontSize || 11}px;--fw:${b.fontWeight || 400};--ta:${b.textAlign || 'right'};--color:${b.color || '#64748b'};--ff:${b.fontFamily || 'Inter'};--lh:${b.lineHeight || 1.65}`;
  return `<div class="p-letterhead" style="${styleStr}">
      <div class="p-letterhead-logo">
        ${b.logoSrc ? `<img src="${b.logoSrc}" class="p-letterhead-img" style="width:${b.logoWidth || 140}px" alt=""/>` : `<div class="p-logo-ph"><i class="ri-image-line"></i>YOUR LOGO</div>`}
      </div>
      <div class="p-letterhead-info" style="${textVars}">${b.content || ''}</div>
    </div>`;
};

export const gen = (b: any) => {
  if (b.type === 'text') {
    const vars = `--bg:${b.bgColor || 'transparent'};--radius:${b.borderRadius || 0}px;--pad:${b.padding || 0}px;--opacity:${b.bgOpacity || 1};--fs:${b.fontSize || 14}px;--fw:${b.fontWeight || 400};--ta:${b.textAlign || 'left'};--td:${b.textDecoration || 'none'};--fst:${b.fontStyle || 'normal'};--color:${b.color || '#334155'};--ff:${b.fontFamily || 'Inter'};--lh:${b.lineHeight || 1.75};--ls:${b.letterSpacing || 0}px`;
    return `<div class="p-text"${keepsWithNext(b) ? ' data-keep="1"' : ''} style="${vars};margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px">${b.content || ''}</div>`;
  }
  if (b.type === 'header') {
    return letterhead(b, `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;`);
  }
  if (b.type === 'logo') {
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;
    // A logo block saved as a letterhead before the Header block existed.
    if (b.logoLayout === 'letterhead') return letterhead({ ...b, content: HEADER_CONTENT, fontSize: 11, textAlign: 'right', color: '#64748b' }, styleStr);
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
    // Names the field for signing: values are sent and matched by field id (fch-api SignedAgreementBuilder).
    const fid = (suffix = '') => `data-field-id="${b.id}${suffix}"`;
    const styleStr = `margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;background-color:${b.bgColor || 'transparent'};padding:${b.padding || 0}px;border-radius:${b.borderRadius || 0}px;opacity:${b.bgOpacity !== undefined ? b.bgOpacity : 1};`;

    if (b.type === 'input') return `<div class="p-field" style="${vars};${styleStr}"><div class="p-input-wrap"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><input type="text" placeholder="${b.fieldPlaceholder || ''}" class="p-input" ${fid()} ${req}/></div></div>`;
    if (b.type === 'textarea') return `<div class="p-field" style="${vars};${styleStr}"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><textarea rows="1" class="p-textarea" ${fid()} placeholder="${b.fieldPlaceholder || ''}" style="font-size:var(--fs);font-weight:var(--fw);color:var(--color);font-family:var(--ff);" ${req}></textarea></div>`;
    if (b.type === 'date') return `<div class="p-field" style="${vars};${styleStr}"><div class="p-input-wrap"><label class="p-label">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}:</label><input type="text" class="form-control flatpickr p-input p-date-input" placeholder="Select Date" ${fid()} ${req}/></div></div>`;
    if (b.type === 'checkbox') return `<div class="p-field" style="${styleStr}"><div class="p-cb-group" style="${vars};justify-content:${b.textAlign === 'center' ? 'center' : b.textAlign === 'right' ? 'flex-end' : 'flex-start'}"><input type="checkbox" class="p-checkbox" ${fid()} ${req}/><label class="p-cb-label" style="font-size:var(--fs);font-weight:var(--fw);color:var(--color);font-family:var(--ff);">${b.fieldLabel}${b.fieldRequired ? ' *' : ''}</label></div></div>`;
    // A signing line: "Sign here" (the signature once signed) over a rule, the
    // signer's name and role under it, and the date signed beside it.
    if (b.type === 'signature') return `<div class="p-sign-card" style="${vars};margin-top:${b.marginTop !== undefined ? b.marginTop : 0}px;margin-bottom:${b.marginBottom !== undefined ? b.marginBottom : 0}px;">
      <div class="p-sign-head"><i class="ri-quill-pen-line"></i>${b.fieldLabel || 'Signature'}${b.fieldRequired ? ' *' : ''}</div>
      <div class="p-sign">
        <div class="p-field p-sign-col">
          <div class="p-sign-pad preview-dropzone" data-block-id="${b.id}">
            <span class="p-sign-x">&times;</span>
            ${b.logoSrc ? `<img src="${b.logoSrc}" class="p-sign-img" alt="Signature">` : `<span class="p-sign-tag"><i class="ri-quill-pen-line"></i>Sign here</span>`}
            <input type="text" class="p-input" ${fid()} ${req} value="${b.logoSrc || ''}" style="position:absolute;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;"/>
          </div>
          <div class="p-sign-rule"></div>
          ${b.showSignerName === true ? '<div class="p-sign-name">{{signer.name}}</div>' : ''}<div class="p-sign-caption">Signature</div>
        </div>
        <div class="p-sign-gap"></div>
        <div class="p-field p-sign-col p-sign-col--date">
          <div class="p-sign-pad">
            <input type="text" class="form-control flatpickr p-sig-input p-sign-date" ${fid(':date')} placeholder="Select date" ${req}/>
          </div>
          <div class="p-sign-rule"></div>
          <div class="p-sign-caption">Date signed</div>
        </div>
      </div>
      <div class="p-sign-foot"><i class="ri-shield-check-line"></i>Recorded in the signature certificate at the end of this agreement</div>
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

/* ── Merge fields in the preview ─────────────────────────────────────────── */
const MERGE_SAMPLE_CSS = '<style>.ab4-merge-sample{background:#eef2ff;color:#3730a3;border-bottom:1px dashed #6366f1;border-radius:3px;padding:0 3px}</style>';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The builder's preview shows merge fields ({{signer.name}} ...) marked as
 * fields: with the owner's real details where the server sent them (`real`,
 * see useAgreementPreviewValues), and example details for the rest - a signer
 * has none while a template is built. Only the preview: the saved template
 * keeps the fields, which the server fills for each signer.
 */
export const withMergeSamples = (html: string, real: Record<string, string> = {}): string => {
  const samples = new Map(AGREEMENT_MERGE_FIELDS.map((f) => [f.key, real[f.key]?.trim() ? escapeHtml(real[f.key].trim()) : f.sample]));
  const filled = html.replace(/\{\{\s*([a-z_.]+)\s*\}\}/g, (token, key: string) =>
    samples.has(key) ? `<span class="ab4-merge-sample" title="{{${key}}}">${samples.get(key)}</span>` : token);
  return filled === html ? html : filled.replace('</head>', `${MERGE_SAMPLE_CSS}</head>`);
};

/* ── ID helper ───────────────────────────────────────────────────────────── */
let _uid = Date.now();
export const uid = () => `b${_uid++}`;

/* ── Palette ─────────────────────────────────────────────────────────────── */
export const PALETTE = [
  {
    group: 'Layout', icon: 'ri-layout-line', items: [
      { type: 'logo', label: 'Company Logo', icon: 'ri-image-line' },
      { type: 'header', label: 'Header', icon: 'ri-layout-top-line' },
      { type: 'divider', label: 'Divider', icon: 'ri-separator' },
      { type: 'spacer', label: 'Spacer', icon: 'ri-space' },
      { type: 'page-break', label: 'Page Break', icon: 'ri-scissors-cut-line' },
      { type: 'parties', label: 'Parties Row', icon: 'ri-group-line' },
    ]
  },
  {
    group: 'Text', icon: 'ri-text', items: [
      { type: 'text', label: 'Text Block', icon: 'ri-text' },
      { type: 'heading', label: 'Heading', icon: 'ri-heading' },
      { type: 'bullet-list', label: 'Bulleted List', icon: 'ri-list-unordered' },
      { type: 'numbered-list', label: 'Numbered List', icon: 'ri-list-ordered' },
      { type: 'table', label: 'Table', icon: 'ri-table-line' },
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

/**
 * Moves a block so it lands at `toIndex` of the list as it was before the move
 * (dropping on the block below it at index 3 means "before that block").
 */
export const moveBlock = <T extends { id: string }>(blocks: T[], id: string, toIndex: number): T[] => {
  const from = blocks.findIndex((b) => b.id === id);
  if (from < 0) return blocks;
  const target = toIndex > from ? toIndex - 1 : toIndex;
  if (target === from) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};

/**
 * Heading, lists and table are text blocks with a starting style and content,
 * so they edit, paginate, take merge fields and sign like any text block.
 */
const TEXT_PRESETS: Record<string, { content: string } & Partial<typeof TEXT_DEFAULTS>> = {
  text: { content: 'Enter text here...' },
  heading: { content: 'Section heading', fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 1.35, marginTop: 6, marginBottom: 8 },
  'bullet-list': { content: '<ul><li>First point</li><li>Second point</li><li>Third point</li></ul>' },
  'numbered-list': { content: '<ol><li>First point</li><li>Second point</li><li>Third point</li></ol>' },
  table: {
    content: '<table><thead><tr><th>Item</th><th>Details</th><th>Amount</th></tr></thead>'
      + '<tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>',
  },
};

export const makeBlock = (paletteType: string) => ({
  id: uid(),
  type: TEXT_PRESETS[paletteType] ? 'text' : paletteType,
  paletteType,
  ...TEXT_DEFAULTS,
  ...(TEXT_PRESETS[paletteType] || { content: '' }),
  // parties
  partyALabel: 'Party A', partyBLabel: 'Party B',
  partyLabelColor: '#6366f1', partyLabelSize: 10, partyLabelWeight: '800', partyLabelFamily: 'Inter, sans-serif',
  partyLabelAlign: 'left', partyLabelTransform: 'uppercase', partyLabelDecoration: 'none', partyLabelLineHeight: 1.2, partyLabelSpacing: 0.5,
  partyA: [{ id: uid(), type: 'text', content: 'Party A Name Editor...', ...TEXT_DEFAULTS }],
  partyB: [{ id: uid(), type: 'text', content: 'Party B Name Editor...', ...TEXT_DEFAULTS }],
  // logo
  logoSrc: null, logoAlign: 'left', logoWidth: 180, logoFullWidth: false,
  showSignerName: false,
  // fields
  fieldLabel: (FIELD_DEF as any)[paletteType] || '', fieldRequired: false, fieldPlaceholder: '', spacerHeight: 32,
  // background/extra
  bgColor: 'transparent', bgOpacity: 1, borderRadius: 0, padding: 0,
  ...(paletteType === 'header' ? HEADER_DEFAULTS : {}),
});

/** A new Header: a smaller logo, and the company's details right-aligned in small grey text. */
const HEADER_DEFAULTS = {
  content: HEADER_CONTENT, logoWidth: 140, fontSize: 11, textAlign: 'right', color: '#64748b', lineHeight: 1.65, marginBottom: 24,
};

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
    // Merge fields: filled with the agreement owner's and each signer's details when they sign.
    partyA: [
      { ...makeBlock('text'), content: '{{owner.company_name}}', fontWeight: '700', fontSize: 13, marginBottom: 4 },
      { ...makeBlock('text'), content: '{{owner.address}}\nEmail: {{owner.email}}\nPhone: {{owner.phone}}', fontSize: 11, color: '#64748b' }
    ],
    partyB: [
      { ...makeBlock('text'), content: '{{signer.name}}', fontWeight: '700', fontSize: 13, marginBottom: 4 },
      { ...makeBlock('text'), content: '{{signer.business_name}}\n{{signer.business_address}}\nEmail: {{signer.email}}\nPhone: {{signer.phone}}', fontSize: 11, color: '#64748b' }
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

/* ── Table blocks: rows and columns ────────────────────────────────────── */
/** Runs `edit` on the first table in a text block's content; content without a table is returned as it is. */
const editTable = (html: string, edit: (table: HTMLTableElement) => void): string => {
  const root = document.createElement('div');
  root.innerHTML = html;
  const table = root.querySelector('table');
  if (!table) return html;
  edit(table);
  return root.innerHTML;
};

const bodyRows = (table: HTMLTableElement) => Array.from(table.tBodies[0]?.rows || []);
const allRows = (table: HTMLTableElement) => Array.from(table.rows);

export const hasTable = (html: string): boolean => /<table[\s>]/i.test(html);

export const addTableRow = (html: string) => editTable(html, (table) => {
  const rows = bodyRows(table);
  const columns = rows[0]?.cells.length || table.rows[0]?.cells.length || 1;
  const row = (table.tBodies[0] || table.createTBody()).insertRow();
  for (let i = 0; i < columns; i++) row.insertCell().innerHTML = '&nbsp;';
});

export const removeTableRow = (html: string) => editTable(html, (table) => {
  const rows = bodyRows(table);
  if (rows.length > 1) rows[rows.length - 1].remove();
});

export const addTableColumn = (html: string) => editTable(html, (table) => {
  allRows(table).forEach((row) => {
    const isHeader = row.parentElement?.tagName === 'THEAD';
    const cell = document.createElement(isHeader ? 'th' : 'td');
    cell.innerHTML = isHeader ? 'Column' : '&nbsp;';
    row.appendChild(cell);
  });
});

export const removeTableColumn = (html: string) => editTable(html, (table) => {
  allRows(table).forEach((row) => {
    if (row.cells.length > 1) row.cells[row.cells.length - 1].remove();
  });
});

export const COLOR_SWATCHES = [
  '#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8',
  '#dc2626', '#ea580c', '#d97706', '#fbbf24', '#16a34a', '#059669',
  '#0284c7', '#2563eb', '#6366f1', '#7c3aed', '#8b5cf6', '#a855f7',
  '#db2777', '#ec4899', '#f43f5e', '#ffffff', 'transparent'
];
