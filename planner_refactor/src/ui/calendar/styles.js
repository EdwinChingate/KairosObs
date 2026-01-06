/**
 * Calendar view style snippets reused across rendering functions.
 */
const OFFSET_Y = 100;
const PIXELS_PER_MIN = 3;
const COL_SPACING = 340;
const TEXT_HEIGHT_THRESHOLD = 30;

const cvContainerStyle = `
  position: relative;
  width: 100%;
  height: 600px; 
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: auto;
  font-family: var(--font-interface);
  margin-top: 5px;
`;

const cvControlStyle = `
  display: flex; 
  gap: 15px; 
  margin-bottom: 5px; 
  align-items: center;
  font-family: var(--font-interface);
  background: var(--background-secondary);
  padding: 8px;
  border-radius: 8px;
`;

const cvGridLineStyle = `
  position: absolute;
  left: 50px; right: 0;
  border-top: 1px solid var(--background-modifier-border);
  opacity: 0.3;
  pointer-events: none;
`;

const cvTimeLabelStyle = `
  position: absolute;
  left: 4px;
  width: 40px;
  text-align: right;
  font-size: 10px;
  color: var(--text-muted);
  transform: translateY(-50%);
`;

const cvBlockStyle = (y, h, color, colIndex, scale) => `
  position: absolute;
  left: ${(colIndex * COL_SPACING * scale) + 60}px; 
  top: ${(y - OFFSET_Y) * scale}px;
  width: ${320 * scale}px;
  height: ${h * scale}px;
  background-color: ${color}33; 
  border-left: 3px solid ${color};
  padding: 4px;
  font-size: ${12 * (scale < 0.6 ? 0.8 : 1)}px;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: var(--text-normal);
  line-height: 1.2;
  white-space: nowrap; 
  text-overflow: ellipsis;
  z-index: 5;
`;

module.exports = {
  OFFSET_Y,
  PIXELS_PER_MIN,
  COL_SPACING,
  TEXT_HEIGHT_THRESHOLD,
  cvContainerStyle,
  cvControlStyle,
  cvGridLineStyle,
  cvTimeLabelStyle,
  cvBlockStyle,
};
