import { nanoid } from "nanoid";
import Url from "../models/Url.js";

const generateShortCode = () => nanoid(8);

const buildShortUrl = (req, shortCode) => {
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/${shortCode}`;
};

const validateUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
};

export const createShortUrl = async (req, res) => {
  const { longUrl } = req.body;

  if (!longUrl || typeof longUrl !== "string") {
    return res.status(400).json({ message: "Please provide a valid longUrl." });
  }

  if (!validateUrl(longUrl)) {
    return res.status(400).json({ message: "Invalid URL format. Use http:// or https://" });
  }

  try {
    let existing = await Url.findOne({ longUrl });

    if (existing) {
      return res.json({
        longUrl: existing.longUrl,
        shortCode: existing.shortCode,
        shortUrl: existing.shortUrl,
      });
    }

    let shortCode = generateShortCode();
    let existingCode = await Url.findOne({ shortCode });

    while (existingCode) {
      shortCode = generateShortCode();
      existingCode = await Url.findOne({ shortCode });
    }

    const shortUrl = buildShortUrl(req, shortCode);

    const url = new Url({ longUrl, shortCode, shortUrl });
    await url.save();

    return res.status(201).json({ longUrl, shortCode, shortUrl });
  } catch (error) {
    console.error("Error creating short URL:", error);
    return res.status(500).json({ message: "Server error creating short URL." });
  }
};

export const redirectToLongUrl = async (req, res) => {
  const { code } = req.params;

  try {
    const url = await Url.findOne({ shortCode: code });
    if (!url) {
      return res.status(404).json({ message: "Short URL not found." });
    }

    return res.redirect(url.longUrl);
  } catch (error) {
    console.error("Redirect failed:", error);
    return res.status(500).json({ message: "Server error redirecting to URL." });
  }
};
