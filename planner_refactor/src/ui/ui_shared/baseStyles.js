/**
 * Base styles applied to the planner UI and suggester panel.
 */
const baseCss = `
.chat-wrap{font:14px/1.45 var(--font-interface);background:#54B5FB !important; border:1px solid var(--background-modifier-border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px}
.row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
textarea{width:100%; height:88px; resize:vertical; border-radius:10px; padding:10px; border:1px solid var(--background-modifier-border);background:#094782 !important; color:var(--text-normal)}
textarea.ref{width:50%; min-height:10px}
textarea.ref2{width:48%; min-height:10px;background:var(--background-primary);border-color:var(--background-primary);cursor:none}
.log{max-height:260px; overflow:auto; padding:6px; background:var(--background-secondary); border-radius:8px}
.msg{margin:6px 0}
.msg .meta{font-size:12px; color:var(--text-muted)}
.embed-box { display:none; }

.suggest-panel{position:absolute; z-index:9999; max-height:280px; overflow:auto; border:1px solid var(--background-modifier-border); background:var(--background-primary); border-radius:8px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,.25); min-width:320px}
.suggest-head{display:flex; gap:8px; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid var(--background-modifier-border); justify-content: space-between;}
.suggest-bc{font-size:12px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-grow: 1;}
.suggest-nav{display:flex; gap:4px;}
.nav-btn{padding:2px 10px; border-radius:4px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer; font-size:14px; line-height:1;}
.suggest-list{margin-top:6px}
.suggest-item{padding:6px 8px; border-radius:6px; cursor:pointer; display:flex; gap:8px; align-items:center}
.suggest-item:hover,.suggest-item.active{background:var(--background-secondary)}
.suggest-item small{opacity:.7}
.suggest-icon{width:1.2em; text-align:center}
.suggest-item.active{outline:1px solid var(--interactive-accent)}
.suggest-input-hint{padding:8px; font-style:italic; opacity:0.8; border-top:1px solid var(--background-modifier-border)}
.suggest-section-title{margin:6px 0 2px 0; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;}
/* Calendar */
.cal-box{display:none; position:fixed; z-index:10050; width:320px; max-width:92vw; background:var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,.35); padding:10px}
.cal-head{display:flex; align-items:center; justify-content:space-between; gap:6px; padding:4px 2px 10px 2px}
.cal-title{font-weight:700; font-size:13px; text-align:center; flex:1}
.cal-nav{display:flex; gap:4px}
.cal-nav button{padding:2px 8px; border-radius:6px; border:1px solid var(--background-modifier-border); background:var(--interactive-normal); cursor:pointer}
.cal-week{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px; font-size:11px; color:var(--text-muted); text-align:center}
.cal-grid{display:grid; grid-template-columns:repeat(7,1fr); gap:4px}
.cal-day{border-radius:6px; padding:8px 0; text-align:center; cursor:pointer}
.cal-day:hover{background:var(--background-secondary)}
.cal-day.today{outline:1px solid var(--interactive-accent)}
.cal-day.selected{background:var(--interactive-accent); color:var(--text-on-accent);}
.cal-day.muted{opacity:0.5}
`;

module.exports = { baseCss };
