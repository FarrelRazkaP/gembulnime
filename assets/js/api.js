/**
 * CineStream / KuroNonton - Wajik Anime API Integration Service
 * Repository: https://github.com/wajik45/wajik-anime-api
 * 
 * Supports:
 * - Ongoing Anime (/otakudesu/ongoing)
 * - Complete Anime (/otakudesu/complete)
 * - Anime Detail (/otakudesu/anime/:id)
 * - Streaming Embeds & Download Links (/otakudesu/episode/:id)
 * - Live Search (/otakudesu/search?q=...)
 * - Automatic fallback to curated offline data if API is offline
 */

const WajikAPI = {
  // Ubah ke http://localhost:3001 jika menjalankan server wajik-anime-api di komputer sendiri
  baseUrl: localStorage.getItem("wajik_api_url") || "https://wajik-anime-api.vercel.app",
  source: "otakudesu", // Sumber default: otakudesu atau kuramanime

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/$/, "");
    localStorage.setItem("wajik_api_url", this.baseUrl);
  },

  async request(endpoint) {
    try {
      const url = `${this.baseUrl}/${this.source}${endpoint}`;
      const response = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const json = await response.json();
      return json.data || json;
    } catch (err) {
      console.warn(`[WajikAPI] Gagal mengambil dari ${endpoint}:`, err.message);
      return null;
    }
  },

  // 1. Ambil Anime yang Sedang Tayang (Ongoing)
  async getOngoing(page = 1) {
    return await this.request(`/ongoing?page=${page}`);
  },

  // 2. Ambil Anime yang Sudah Tamat (Complete)
  async getComplete(page = 1) {
    return await this.request(`/complete?page=${page}`);
  },

  // 3. Ambil Detail Lengkap Anime + Daftar Episode
  async getAnimeDetail(animeId) {
    return await this.request(`/anime/${animeId}`);
  },

  // 4. Ambil Link Streaming Video & Download Episode
  async getEpisodeStream(episodeId) {
    return await this.request(`/episode/${episodeId}`);
  },

  // 5. Cari Anime Berdasarkan Kata Kunci
  async searchAnime(keyword) {
    return await this.request(`/search?q=${encodeURIComponent(keyword)}`);
  }
};
