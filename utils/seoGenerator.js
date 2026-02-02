/**
 * SEO Generator Utilities
 * Auto-generates SEO-friendly metadata for videos
 */

/**
 * Generate URL-friendly slug from title and optional year
 * @param {string} title - Video title
 * @param {number|string|null} year - Release year (optional)
 * @returns {string} - URL-friendly slug
 */
function generateSlug(title, year = null) {
    let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single
        .substring(0, 200);        // Limit length

    if (year) {
        slug += `-${year}`;
    }

    return slug;
}

/**
 * Generate SEO-optimized title (max 60 chars for Google)
 * @param {object} video - Video data
 * @returns {string} - SEO title
 */
function generateSeoTitle(video) {
    const { title, releaseYear, videoQuality, type } = video;

    let seoTitle = title;

    if (releaseYear) {
        seoTitle += ` (${releaseYear})`;
    }

    if (videoQuality && videoQuality !== 'SD') {
        seoTitle += ` Watch in ${videoQuality}`;
    }

    const contentType = type === 'REEL' ? 'Reel' : 'Movie';
    seoTitle += ` ${contentType} | Tirhuta`;

    // Trim to 60 chars
    return seoTitle.substring(0, 60);
}

/**
 * Generate SEO-optimized description (max 160 chars for Google)
 * @param {object} video - Video data
 * @returns {string} - SEO description
 */
function generateSeoDescription(video) {
    const { title, releaseYear, description, cast, director, videoQuality, audioLanguages } = video;

    let desc = `Watch ${title}`;

    if (releaseYear) {
        desc += ` (${releaseYear})`;
    }

    if (director) {
        desc += ` directed by ${director}`;
    }

    if (cast && Array.isArray(cast) && cast.length > 0) {
        desc += ` starring ${cast.slice(0, 2).join(', ')}`;
    }

    if (videoQuality) {
        desc += ` in ${videoQuality}`;
    }

    if (audioLanguages && Array.isArray(audioLanguages) && audioLanguages.length > 0) {
        desc += ` with ${audioLanguages.join(', ')} audio`;
    }

    desc += ' on Tirhuta';

    // Trim to 160 chars
    return desc.substring(0, 160);
}

/**
 * Generate Schema.org VideoObject structured data for rich snippets
 * @param {object} video - Video data
 * @param {string} baseUrl - Base URL (default: https://tirhuta.com)
 * @returns {object} - Structured data JSON-LD
 */
function generateStructuredData(video, baseUrl = 'https://tirhuta.com') {
    const {
        title, description, thumbnailUrl, createdAt, duration,
        slug, rating, director, cast, tags,
        productionCompany, videoQuality, language, releaseDate, viewsCount
    } = video;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title,
        "description": description || title,
        "thumbnailUrl": thumbnailUrl || `${baseUrl}/default-thumbnail.jpg`,
        "uploadDate": createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        "contentUrl": slug ? `${baseUrl}/watch/${slug}` : baseUrl,
    };

    if (duration) {
        // Convert seconds to ISO 8601 duration format (PT#M#S)
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        structuredData.duration = `PT${minutes}M${seconds}S`;
    }

    if (rating) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": rating,
            "bestRating": "10",
            "worstRating": "1",
            "ratingCount": viewsCount || 1
        };
    }

    if (director) {
        structuredData.director = {
            "@type": "Person",
            "name": director
        };
    }

    if (cast && Array.isArray(cast) && cast.length > 0) {
        structuredData.actor = cast.map(name => ({
            "@type": "Person",
            "name": name
        }));
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
        structuredData.keywords = tags.join(', ');
    }

    if (productionCompany) {
        structuredData.productionCompany = {
            "@type": "Organization",
            "name": productionCompany
        };
    }

    if (videoQuality) {
        structuredData.videoQuality = videoQuality;
    }

    if (language) {
        structuredData.inLanguage = language;
    }

    if (releaseDate) {
        structuredData.datePublished = new Date(releaseDate).toISOString();
    }

    return structuredData;
}

module.exports = {
    generateSlug,
    generateSeoTitle,
    generateSeoDescription,
    generateStructuredData
};
