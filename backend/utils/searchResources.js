import axios from "axios";

/**
 * Search for articles/resources using Google Custom Search API (no AI needed)
 * Alternative to AI-based resource generation
 * @param {string} query - Search query
 * @param {string} apiKey - Google Custom Search API key
 * @param {string} searchEngineId - Custom Search Engine ID
 * @returns {Promise<Array<string>>} Array of URLs
 */
export async function searchGoogleCustom(query, apiKey, searchEngineId) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: 5 // Get top 5 results
      }
    });

    const links = response.data.items?.map(item => item.link) || [];
    return links.filter(link => link && (link.startsWith('http://') || link.startsWith('https://')));
  } catch (err) {
    if (err.response) {
      console.error(`❌ Google Custom Search error (${err.response.status}):`, err.response.data?.error?.message || err.message);
      if (err.response.status === 403) {
        console.error("   Possible causes:");
        console.error("   - Custom Search API not enabled in Google Cloud Console");
        console.error("   - API key doesn't have Custom Search API permission");
        console.error("   - Wrong Search Engine ID");
      }
    } else {
      console.error("❌ Google Custom Search error:", err.message);
    }
    throw err; // Re-throw so caller can handle it
  }
}

/**
 * Search for astronomy resources using multiple queries (no AI)
 * @param {string} title - APOD title
 * @param {string} explanation - APOD explanation
 * @returns {Promise<Array<string>>} Array of resource URLs
 */
export async function findAstronomyResources(title, explanation) {
  // Use GEMINI_API_KEY (which should be a Google Cloud API key) for Custom Search
  const GOOGLE_SEARCH_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!GOOGLE_SEARCH_API_KEY) {
    console.warn("⚠️ Google Search API key not found. Returning curated astronomy links.");
    return getCuratedAstronomyLinks(title).slice(0, 5);
  }

  if (!GOOGLE_SEARCH_ENGINE_ID) {
    console.warn("⚠️ Google Search Engine ID not configured. Returning curated astronomy links.");
    console.warn("   To enable search: Create a Custom Search Engine at https://programmablesearchengine.google.com/");
    return getCuratedAstronomyLinks(title).slice(0, 5);
  }

  // Create one comprehensive search query
  const explanationWords = explanation.split(' ').slice(0, 20).join(' ');
  const searchQuery = `${title} ${explanationWords} astronomy NASA ESA article`;

  try {
    // Get top 5 search results
    const links = await searchGoogleCustom(searchQuery, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID);
    
    if (links.length > 0) {
      console.log(`✅ Found ${links.length} search results`);
      return links.slice(0, 5); // Return top 5
    } else {
      console.warn("⚠️ No search results found");
      return getCuratedAstronomyLinks(title).slice(0, 5);
    }
  } catch (err) {
    console.warn("⚠️ Google Search failed, using curated astronomy links");
    return getCuratedAstronomyLinks(title).slice(0, 5);
  }
}

/**
 * Get curated astronomy resource links (fallback if search API not available)
 * @param {string} title - APOD title
 * @returns {Array<string>} Array of common astronomy resource URLs
 */
function getCuratedAstronomyLinks(title) {
  const baseLinks = [
    "https://apod.nasa.gov/apod/astropix.html",
    "https://www.nasa.gov/topics/solarsystem/index.html",
    "https://www.esa.int/Science_Exploration/Space_Science",
    "https://hubblesite.org/",
    "https://www.jpl.nasa.gov/",
    "https://www.space.com/",
    "https://www.astronomy.com/",
    "https://skyandtelescope.org/"
  ];

  // Try to find related APOD entries
  const apodYear = new Date().getFullYear();
  const apodLinks = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i - 365); // Look back in 2024
    const dateStr = date.toISOString().split('T')[0];
    apodLinks.push(`https://apod.nasa.gov/apod/ap${dateStr.replace(/-/g, '').slice(2)}.html`);
  }

  return [...baseLinks, ...apodLinks].slice(0, 10);
}

