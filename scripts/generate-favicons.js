const sharp = require('sharp');
const fs = require('fs');

async function generateFavicons() {
  try {
    const inputPath = 'public/logo.png';
    
    // Test if file exists
    if (!fs.existsSync(inputPath)) {
      console.error("Input image not found!");
      return;
    }

    const sizes = [16, 32, 48, 96, 144, 180, 192, 512];
    
    for (const size of sizes) {
      await sharp(inputPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(`public/favicon-${size}.png`);
      console.log(`Generated favicon-${size}.png`);
    }

    // Replace the main SVG and ICO if they exist
    await sharp(inputPath).resize(32, 32).png().toFile('public/favicon.ico');
    console.log('Overwrote favicon.ico with PNG masquerading as ICO');
    
    // Also overwrite logo.png
    await sharp(inputPath).resize(512, 512).png().toFile('public/logo.png');
    console.log('Overwrote logo.png');
    
    // Overwrite apple-touch-icon
    await sharp(inputPath).resize(180, 180).png().toFile('public/apple-icon.png');
    
  } catch (err) {
    console.error("Error:", err);
  }
}

generateFavicons();
