import { findAstronomyResources } from "./searchResources.js";
import Apod from "../models/Apod.js";

/**
 * Generates additional resources (articles, videos, links) for an APOD
 * Uses Google Custom Search API (no AI needed) or curated fallback links
 * @param {string} date - APOD date
 * @param {string} title - APOD title
 * @param {string} explanation - APOD explanation
 * @returns {Promise<Array<string>>} Array of resource URLs/links
 */
export async function generateAdditionalResources(date, title, explanation) {
  try {
    console.log(`🔍 Searching for resources related to: ${title}...`);
    
    // Use direct search API (no AI needed)
    const resources = await findAstronomyResources(title, explanation);

    if (resources.length === 0) {
      console.warn("⚠️ No resources found");
      return [];
    }

    console.log(`✅ Found ${resources.length} additional resources`);
    return resources;
  } catch (err) {
    console.error("❌ Error generating additional resources:", err.message);
    return [];
  }
}

/**
 * Updates an APOD document with generated additional resources
 * @param {string} date - APOD date
 * @param {Array<string>} resources - Array of resource URLs
 */
export async function updateApodWithResources(date, resources) {
  try {
    const apod = await Apod.findOne({ date });
    if (!apod) {
      console.warn(`⚠️ APOD not found for date ${date}, cannot update resources`);
      return;
    }

    apod.additionalResources = resources;
    await apod.save();
    console.log(`✅ Updated APOD ${date} with ${resources.length} additional resources`);
  } catch (err) {
    console.error("❌ Error updating APOD with resources:", err.message);
  }
}

