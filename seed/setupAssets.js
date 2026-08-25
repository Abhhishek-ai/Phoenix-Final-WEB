const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\e7f5a285-e4cc-45ae-95f6-5ca2b30b77d4';
const baseDest = path.join(__dirname, '..', 'public', 'images');

const dirs = [
  path.join(baseDest, 'team'),
  path.join(baseDest, 'timeline'),
  path.join(baseDest, 'video'),
  path.join(baseDest, 'skills'),
  path.join(baseDest, 'hero')
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

const fileMappings = [
  { src: 'team_lead_portrait_1787251574161.jpg', dest: 'team/lead.jpg' },
  { src: 'team_design_portrait_1787251596777.jpg', dest: 'team/design.jpg' },
  { src: 'team_ai_portrait_1787251614699.jpg', dest: 'team/ai.jpg' },
  { src: 'video_showcase_poster_1787251634629.jpg', dest: 'video/poster.jpg' },
  { src: 'timeline_idea_1787251655959.jpg', dest: 'timeline/01-idea.jpg' },
  { src: 'timeline_firststep_1787251675364.jpg', dest: 'timeline/02-first-step.jpg' }
];

fileMappings.forEach(mapping => {
  const srcPath = path.join(srcDir, mapping.src);
  const destPath = path.join(baseDest, mapping.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${mapping.src} -> ${mapping.dest}`);
  }
});

// Also copy or generate placeholders for timeline 03, 04, 05 if needed
if (fs.existsSync(path.join(srcDir, 'video_showcase_poster_1787251634629.jpg'))) {
  fs.copyFileSync(path.join(srcDir, 'video_showcase_poster_1787251634629.jpg'), path.join(baseDest, 'timeline', '03-community.jpg'));
  fs.copyFileSync(path.join(srcDir, 'timeline_firststep_1787251675364.jpg'), path.join(baseDest, 'timeline', '04-first-projects.jpg'));
  fs.copyFileSync(path.join(srcDir, 'timeline_idea_1787251655959.jpg'), path.join(baseDest, 'timeline', '05-phoenix-today.jpg'));
}

console.log('Asset directory setup completed successfully.');
