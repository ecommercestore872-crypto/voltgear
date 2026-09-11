import sharp from "sharp";
import fs from "fs";
import path from "path";

async function run() {
  const input = "C:/Users/aliab/.gemini/antigravity/brain/6e7bcd8e-09b2-4a1b-88ff-3cbb9a7e1a19/uploaded_media_1788839470403.img";
  const output = "C:/Users/aliab/.gemini/antigravity/brain/6e7bcd8e-09b2-4a1b-88ff-3cbb9a7e1a19/enhanced_test.jpg";
  
  try {
    const meta = await sharp(input).metadata();
    console.log("Metadata:", meta);

    await sharp(input)
      .flatten({ background: '#ffffff' })
      .resize(1080, 1080, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .modulate({
        brightness: 1.05,
        saturation: 1.2,
      })
      .jpeg({ quality: 90 })
      .toFile(output);
      
    console.log("Success! Wrote to", output);
  } catch (err) {
    console.error("Error processing with sharp:", err);
  }
}
run();
