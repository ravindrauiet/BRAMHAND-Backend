const pool = require('../config/db');

// @desc    Get all videos
// @route   GET /api/admin/videos
const getAllVideos = async (req, res) => {
    try {
        const type = req.query.type || 'VIDEO';
        const [videos] = await pool.query(`
            SELECT v.id, v.title, v.description, v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl,
                   v.views_count as viewsCount, v.likes_count as likesCount, v.comments_count as commentsCount, v.shares_count as sharesCount, 
                   v.is_active as isActive, v.is_trending as isTrending, v.is_featured as isFeatured, v.content_rating as contentRating,
                   v.created_at as createdAt, v.category_id as categoryId, v.creator_id as creatorId,
                   c.name as categoryName, u.full_name as creatorName, u.profile_image as creatorImage
            FROM videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.creator_id = u.id
            WHERE v.type = ?
            ORDER BY v.created_at DESC
        `, [type]);

        res.json({ success: true, videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Video
// @route   DELETE /api/admin/videos/:id
const deleteVideo = async (req, res) => {
    try {
        await pool.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Video deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Toggle Video Status
// @route   PATCH /api/admin/videos/:id/status
const toggleVideoStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        await pool.query('UPDATE videos SET is_active = ? WHERE id = ?', [isActive === true || isActive === 'true' ? 1 : 0, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Single Video
// @route   GET /api/admin/videos/:id
const getVideoById = async (req, res) => {
    try {
        const [videos] = await pool.query(`
            SELECT *, CAST(file_size AS CHAR) as file_size FROM videos WHERE id = ?
        `, [req.params.id]);
        if (videos.length === 0) return res.status(404).json({ success: false, message: 'Video not found' });
        res.json({ success: true, video: videos[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload New Video
// @route   POST /api/admin/videos
const uploadVideo = async (req, res) => {
    try {
        const {
            title,
            description,
            categoryId,
            genreId,
            creatorId,
            language = 'Hindi',
            contentRating = 'U',
            type = 'VIDEO',
            isActive = 'true',
            isTrending = 'false',
            isFeatured = 'false',
            seriesId = null,
            episodeNumber = null,
            seasonNumber = 1,
            duration,
            cast,
            crew,
            // Netflix-style fields
            tags,
            releaseDate,
            releaseYear,
            trailerUrl,
            rating,
            maturityRating,
            country,
            productionCompany,
            director,
            awards,
            subtitles,
            audioLanguages,
            videoQuality,
            // SEO fields
            slug,
            seoTitle,
            seoDescription,
            seoKeywords,
            ogImage,
            ogTitle,
            ogDescription
        } = req.body;

        let videoUrl = null;
        let thumbnailUrl = null;
        let fileSize = null;

        // Get uploaded file URLs from multer-s3
        if (req.files) {
            if (req.files.video && req.files.video[0]) {
                videoUrl = req.files.video[0].location; // S3 URL
                fileSize = req.files.video[0].size; // File size in bytes
            }
            if (req.files.thumbnail && req.files.thumbnail[0]) {
                thumbnailUrl = req.files.thumbnail[0].location; // S3 URL
            }
        }

        if (!videoUrl && req.body.video_url) videoUrl = req.body.video_url; // Allow body URL for testing

        if (!videoUrl) {
            return res.status(400).json({ success: false, message: 'Video file is required' });
        }

        // Parse cast and crew if they're strings (from form data)
        let castData = null;
        let crewData = null;

        if (cast) {
            try {
                castData = typeof cast === 'string' ? JSON.parse(cast) : cast;
            } catch (e) {
                console.error('Error parsing cast:', e);
            }
        }

        if (crew) {
            try {
                crewData = typeof crew === 'string' ? JSON.parse(crew) : crew;
            } catch (e) {
                console.error('Error parsing crew:', e);
            }
        }

        // Parse other JSON fields
        let tagsData = null;
        let subtitlesData = null;
        let audioLanguagesData = null;

        if (tags) {
            try {
                tagsData = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                console.error('Error parsing tags:', e);
            }
        }

        if (subtitles) {
            try {
                subtitlesData = typeof subtitles === 'string' ? JSON.parse(subtitles) : subtitles;
            } catch (e) {
                console.error('Error parsing subtitles:', e);
            }
        }

        if (audioLanguages) {
            try {
                audioLanguagesData = typeof audioLanguages === 'string' ? JSON.parse(audioLanguages) : audioLanguages;
            } catch (e) {
                console.error('Error parsing audioLanguages:', e);
            }
        }

        // Auto-generate SEO fields if not provided
        const { generateSlug, generateSeoTitle, generateSeoDescription, generateStructuredData } = require('../utils/seoGenerator');

        const finalSlug = slug || generateSlug(title, releaseYear);
        const finalSeoTitle = seoTitle || generateSeoTitle({ title, releaseYear, videoQuality, type });
        const finalSeoDescription = seoDescription || generateSeoDescription({
            title, releaseYear, description, cast: castData, director, videoQuality, audioLanguages: audioLanguagesData
        });
        const finalOgImage = ogImage || thumbnailUrl;
        const finalOgTitle = ogTitle || finalSeoTitle;
        const finalOgDescription = ogDescription || finalSeoDescription;
        const canonicalUrl = `https://tirhuta.com/watch/${finalSlug}`;

        // Generate structured data
        const structuredDataObj = generateStructuredData({
            title, description, thumbnailUrl, createdAt: new Date(), duration,
            slug: finalSlug, rating, director, cast: castData, tags: tagsData,
            productionCompany, videoQuality, language, releaseDate, viewsCount: 0
        });


        // Insert video into database
        const [result] = await pool.query(
            `INSERT INTO videos (
                title, description, video_url, thumbnail_url, 
                category_id, genre_id, creator_id, language, content_rating, type,
                is_active, is_trending, is_featured,
                series_id, episode_number, season_number,
                duration, file_size, cast, crew,
                tags, release_date, release_year, trailer_url,
                rating, maturity_rating, country, production_company,
                director, awards, subtitles, audio_languages, video_quality,
                slug, seo_title, seo_description, seo_keywords,
                og_image, og_title, og_description, canonical_url, structured_data,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                title,
                description || null,
                videoUrl,
                thumbnailUrl || null,
                categoryId,
                genreId || null,
                creatorId,
                language,
                contentRating,
                type,
                isActive === 'true' || isActive === true ? 1 : 0,
                isTrending === 'true' || isTrending === true ? 1 : 0,
                isFeatured === 'true' || isFeatured === true ? 1 : 0,
                seriesId || null,
                episodeNumber || null,
                seasonNumber || 1,
                duration || null,
                fileSize || null,
                castData ? JSON.stringify(castData) : null,
                crewData ? JSON.stringify(crewData) : null,
                tagsData ? JSON.stringify(tagsData) : null,
                releaseDate || null,
                releaseYear || null,
                trailerUrl || null,
                rating || null,
                maturityRating || null,
                country || null,
                productionCompany || null,
                director || null,
                awards || null,
                subtitlesData ? JSON.stringify(subtitlesData) : null,
                audioLanguagesData ? JSON.stringify(audioLanguagesData) : null,
                videoQuality || null,
                finalSlug,
                finalSeoTitle,
                finalSeoDescription,
                seoKeywords || null,
                finalOgImage,
                finalOgTitle,
                finalOgDescription,
                canonicalUrl,
                JSON.stringify(structuredDataObj)
            ]
        );

        res.json({
            success: true,
            id: result.insertId,
            slug: finalSlug,
            videoUrl,
            thumbnailUrl,
            message: 'Video uploaded successfully'
        });
    } catch (error) {
        console.error('Upload video error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            files: req.files ? Object.keys(req.files) : 'no files'
        });
        res.status(500).json({
            success: false,
            message: error.message || 'Server Error',
            detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Update Video Details (Admin)
// @route   PATCH /api/admin/videos/:id
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, categoryId, genreId, creatorId, language,
            contentRating, type, isActive, isTrending, isFeatured,
            seriesId, episodeNumber, seasonNumber, duration, cast, crew,
            // Netflix-style fields
            tags, releaseDate, releaseYear, trailerUrl, rating, maturityRating,
            country, productionCompany, director, awards, subtitles, audioLanguages, videoQuality,
            // SEO fields
            slug, seoTitle, seoDescription, seoKeywords, ogImage, ogTitle, ogDescription
        } = req.body;

        const updates = [];
        const values = [];

        // Build dynamic update query
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (categoryId !== undefined) { updates.push('category_id = ?'); values.push(categoryId); }
        if (genreId !== undefined) { updates.push('genre_id = ?'); values.push(genreId || null); }
        if (creatorId !== undefined) { updates.push('creator_id = ?'); values.push(creatorId); }
        if (language !== undefined) { updates.push('language = ?'); values.push(language); }
        if (contentRating !== undefined) { updates.push('content_rating = ?'); values.push(contentRating); }
        if (type !== undefined) { updates.push('type = ?'); values.push(type); }
        if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive === 'true' || isActive === true ? 1 : 0); }
        if (isTrending !== undefined) { updates.push('is_trending = ?'); values.push(isTrending === 'true' || isTrending === true ? 1 : 0); }
        if (isFeatured !== undefined) { updates.push('is_featured = ?'); values.push(isFeatured === 'true' || isFeatured === true ? 1 : 0); }
        if (duration !== undefined) { updates.push('duration = ?'); values.push(duration || null); }

        // Parse and update cast/crew
        if (cast !== undefined) {
            try {
                const castData = typeof cast === 'string' ? JSON.parse(cast) : cast;
                updates.push('cast = ?');
                values.push(castData ? JSON.stringify(castData) : null);
            } catch (e) {
                console.error('Error parsing cast:', e);
            }
        }

        if (crew !== undefined) {
            try {
                const crewData = typeof crew === 'string' ? JSON.parse(crew) : crew;
                updates.push('crew = ?');
                values.push(crewData ? JSON.stringify(crewData) : null);
            } catch (e) {
                console.error('Error parsing crew:', e);
            }
        }

        // Netflix-style fields
        if (tags !== undefined) {
            try {
                const tagsData = typeof tags === 'string' ? JSON.parse(tags) : tags;
                updates.push('tags = ?');
                values.push(tagsData ? JSON.stringify(tagsData) : null);
            } catch (e) {
                console.error('Error parsing tags:', e);
            }
        }

        if (releaseDate !== undefined) { updates.push('release_date = ?'); values.push(releaseDate || null); }
        if (releaseYear !== undefined) { updates.push('release_year = ?'); values.push(releaseYear || null); }
        if (trailerUrl !== undefined) { updates.push('trailer_url = ?'); values.push(trailerUrl || null); }
        if (rating !== undefined) { updates.push('rating = ?'); values.push(rating || null); }
        if (maturityRating !== undefined) { updates.push('maturity_rating = ?'); values.push(maturityRating || null); }
        if (country !== undefined) { updates.push('country = ?'); values.push(country || null); }
        if (productionCompany !== undefined) { updates.push('production_company = ?'); values.push(productionCompany || null); }
        if (director !== undefined) { updates.push('director = ?'); values.push(director || null); }
        if (awards !== undefined) { updates.push('awards = ?'); values.push(awards || null); }
        if (videoQuality !== undefined) { updates.push('video_quality = ?'); values.push(videoQuality || null); }

        if (subtitles !== undefined) {
            try {
                const subtitlesData = typeof subtitles === 'string' ? JSON.parse(subtitles) : subtitles;
                updates.push('subtitles = ?');
                values.push(subtitlesData ? JSON.stringify(subtitlesData) : null);
            } catch (e) {
                console.error('Error parsing subtitles:', e);
            }
        }

        if (audioLanguages !== undefined) {
            try {
                const audioLanguagesData = typeof audioLanguages === 'string' ? JSON.parse(audioLanguages) : audioLanguages;
                updates.push('audio_languages = ?');
                values.push(audioLanguagesData ? JSON.stringify(audioLanguagesData) : null);
            } catch (e) {
                console.error('Error parsing audioLanguages:', e);
            }
        }

        // SEO fields
        if (slug !== undefined) { updates.push('slug = ?'); values.push(slug || null); }
        if (seoTitle !== undefined) { updates.push('seo_title = ?'); values.push(seoTitle || null); }
        if (seoDescription !== undefined) { updates.push('seo_description = ?'); values.push(seoDescription || null); }
        if (seoKeywords !== undefined) { updates.push('seo_keywords = ?'); values.push(seoKeywords || null); }
        if (ogImage !== undefined) { updates.push('og_image = ?'); values.push(ogImage || null); }
        if (ogTitle !== undefined) { updates.push('og_title = ?'); values.push(ogTitle || null); }
        if (ogDescription !== undefined) { updates.push('og_description = ?'); values.push(ogDescription || null); }


        // Handle file uploads (if new thumbnail/video provided)
        if (req.files) {
            if (req.files.thumbnail && req.files.thumbnail[0]) {
                const file = req.files.thumbnail[0];
                let thumbnailUrl = file.location; // S3 URL

                if (!thumbnailUrl && file?.path) {
                    const cleanPath = file.path.replace(/\\/g, '/').replace('uploads/', '');
                    thumbnailUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${cleanPath}`;
                }

                if (thumbnailUrl) {
                    updates.push('thumbnail_url = ?');
                    values.push(thumbnailUrl);
                }
            }

            if (req.files.video && req.files.video[0]) {
                const file = req.files.video[0];
                let videoUrl = file.location; // S3 URL

                if (!videoUrl && file?.path) {
                    const cleanPath = file.path.replace(/\\/g, '/').replace('uploads/', '');
                    videoUrl = `${process.env.API_BASE_URL || 'http://localhost:5000'}/uploads/${cleanPath}`;
                }

                if (videoUrl) {
                    updates.push('video_url = ?');
                    values.push(videoUrl);
                }

                // Update file size and duration if available
                if (file.size) {
                    updates.push('file_size = ?');
                    values.push(file.size);
                }
            }
        }

        // Series fields
        if (seriesId !== undefined) { updates.push('series_id = ?'); values.push(seriesId || null); }
        if (episodeNumber !== undefined) { updates.push('episode_number = ?'); values.push(episodeNumber || null); }
        if (seasonNumber !== undefined) { updates.push('season_number = ?'); values.push(seasonNumber || 1); }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await pool.query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Video updated successfully' });
    } catch (error) {
        console.error('❌ Update video error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('Request params:', req.params);
        console.error('Request files:', req.files);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllVideos,
    getVideoById,
    deleteVideo,
    toggleVideoStatus,
    uploadVideo,
    updateVideo
};
