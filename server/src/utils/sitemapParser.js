const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

class SitemapParser {
  static async extractUrlsFromSitemap(sitemapUrl) {
    try {
      console.log('Fetching sitemap from:', sitemapUrl);
      const response = await axios.get(sitemapUrl);
      const parser = new XMLParser();
      const result = parser.parse(response.data);

      // Handle both sitemap index files and regular sitemaps
      if (result.sitemapindex) {
        // This is a sitemap index file
        console.log('Found sitemap index file');
        const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
          ? result.sitemapindex.sitemap 
          : [result.sitemapindex.sitemap];
        
        const allUrls = [];
        for (const sitemap of sitemaps) {
          const urls = await this.extractUrlsFromSitemap(sitemap.loc);
          allUrls.push(...urls);
        }
        return allUrls;
      } else if (result.urlset) {
        // This is a regular sitemap
        const urls = Array.isArray(result.urlset.url) 
          ? result.urlset.url 
          : [result.urlset.url];
        
        return urls.map(url => ({
          loc: url.loc,
          lastmod: url.lastmod || null,
          priority: url.priority || null,
          changefreq: url.changefreq || null
        }));
      }
      
      throw new Error('Invalid sitemap format');
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      throw new Error(`Failed to parse sitemap: ${error.message}`);
    }
  }
}

module.exports = SitemapParser; 