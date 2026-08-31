// optional difficulty ladder, each stage repaints the well and winds the gravity up
export const STAGE_LINES = 20;

export const STAGES = [
  { name: 'THE DOCKS', speed: 1, top: '#0b2a3a', mid: '#071a26', bottom: '#04101a', tint: '#40dcf5' },
  { name: 'THE SHALLOWS', speed: 1.25, top: '#0a2e3c', mid: '#06202c', bottom: '#030f18', tint: '#35f0c8' },
  { name: 'KELP LINE', speed: 1.55, top: '#0a2e2a', mid: '#06201d', bottom: '#030f10', tint: '#4fe08a' },
  { name: 'THE DROP', speed: 1.9, top: '#082436', mid: '#051726', bottom: '#020a12', tint: '#3fb8ff' },
  { name: 'COLD CURRENT', speed: 2.3, top: '#061c34', mid: '#041124', bottom: '#01070f', tint: '#6aa8ff' },
  { name: 'THE TRENCH', speed: 2.8, top: '#0a1430', mid: '#060c20', bottom: '#01050e', tint: '#7f8cff' },
  { name: 'MIDNIGHT ZONE', speed: 3.4, top: '#100a2c', mid: '#0a0620', bottom: '#04020c', tint: '#a05cf0' },
  { name: 'THE ABYSS', speed: 4.2, top: '#16062a', mid: '#0c0318', bottom: '#030008', tint: '#ff5b7f' }
];

export function stageFor(lines) {
  return Math.min(STAGES.length - 1, Math.floor(lines / STAGE_LINES));
}
