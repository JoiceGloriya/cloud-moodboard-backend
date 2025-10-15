const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config();

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  new Azure.StorageSharedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT,
    process.env.AZURE_STORAGE_ACCESS_KEY
  )
);

const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");

    // Mood assignment
    let mood = "neutral";
    const fname = file.originalname.toLowerCase();
    if (fname.includes("happy")) mood = "happy";
    else if (fname.includes("sad")) mood = "sad";
    else if (fname.includes("inspire")) mood = "inspirational";

    const blockBlobClient = containerClient.getBlockBlobClient(`${Date.now()}-${file.originalname}`);
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
      metadata: { mood }
    });

    res.json({ url: blockBlobClient.url, mood });
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

app.get("/images", async (req, res) => {
  try {
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push({ url: `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${process.env.AZURE_CONTAINER_NAME}/${blob.name}`, mood: blob.metadata?.mood });
    }
    res.json(blobs);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT || 5000, () => console.log("Server running on Azure"));
