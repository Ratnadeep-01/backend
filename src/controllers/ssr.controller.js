import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper function to build dynamic HTML document with OpenGraph / SEO tags
const buildHtmlPage = ({
  title = "myTube - Premium Video Platform",
  description = "myTube is a full-stack video sharing platform built with Node.js, Express, MongoDB, and React.",
  image = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
  url = "http://localhost:8000",
  videoUrl = "",
  initialData = null,
}) => {
  const safeData = initialData ? JSON.stringify(initialData).replace(/</g, "\\u003c") : "null";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    
    <!-- Primary Meta Tags -->
    <meta name="title" content="${title}" />
    <meta name="description" content="${description.replace(/"/g, "&quot;")}" />
    <meta name="theme-color" content="#0f0f0f" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="${videoUrl ? "video.other" : "website"}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta property="og:image" content="${image}" />
    ${videoUrl ? `<meta property="og:video" content="${videoUrl}" />` : ""}

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${url}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description.replace(/"/g, "&quot;")}" />
    <meta property="twitter:image" content="${image}" />

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Embedded Initial Server Hydration State -->
    <script>
      window.__INITIAL_SERVER_STATE__ = ${safeData};
    </script>

    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background-color: #0f0f0f;
        color: #f1f1f1;
        min-height: 100vh;
      }
      #root { min-height: 100vh; }
      .ssr-fallback-card {
        max-width: 900px;
        margin: 40px auto;
        padding: 24px;
        background: #181818;
        border-radius: 12px;
        border: 1px solid #272727;
      }
      .ssr-fallback-video {
        width: 100%;
        border-radius: 8px;
        max-height: 480px;
        background: #000;
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div className="ssr-fallback-card" style="max-width:900px;margin:40px auto;padding:24px;background:#181818;border-radius:12px;border:1px solid #272727;">
        <h2 style="font-size:1.4rem;color:#f1f1f1;margin-bottom:8px;">${title}</h2>
        <p style="color:#aaa;font-size:0.95rem;margin-bottom:16px;">${description}</p>
        ${
          videoUrl
            ? `<video controls src="${videoUrl}" poster="${image}" style="width:100%;max-height:480px;border-radius:8px;background:#000;"></video>`
            : `<img src="${image}" alt="Preview" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;" />`
        }
        <div style="margin-top:16px;text-align:center;">
          <a href="${url}" style="display:inline-block;padding:10px 20px;background:#ae7aff;color:#000;font-weight:600;text-decoration:none;border-radius:20px;">Open in myTube Client</a>
        </div>
      </div>
    </div>

    <!-- Client Bundle Script execution notice -->
    <script>
      console.log("[myTube SSR] Server-side rendered entry point served with metadata.");
    </script>
  </body>
</html>`;
};

// 1. Server-Side Watch Route Handler (/watch or /watch/:videoId)
export const renderWatchPage = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId || req.query.v;

  if (!videoId) {
    return res.status(200).send(
      buildHtmlPage({
        title: "Watch Videos - myTube",
        description: "Watch trending high quality videos on myTube platform.",
      })
    );
  }

  try {
    const video = await Video.findById(videoId).populate("owner", "fullName username avatar");

    if (!video) {
      return res.status(404).send(
        buildHtmlPage({
          title: "Video Not Found - myTube",
          description: "The requested video could not be located on myTube.",
        })
      );
    }

    const ownerName = video.owner?.fullName || video.owner?.username || "myTube Creator";
    const title = `${video.title} - ${ownerName} | myTube`;
    const description = video.description
      ? video.description.slice(0, 160)
      : `Watch ${video.title} published by ${ownerName} on myTube.`;

    const fullUrl = `${req.protocol}://${req.get("host")}/watch?v=${video._id}`;

    return res.status(200).send(
      buildHtmlPage({
        title,
        description,
        image: video.thumbnail,
        url: fullUrl,
        videoUrl: video.videoFile,
        initialData: {
          page: "watch",
          videoId: video._id,
          video: {
            _id: video._id,
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail,
            videoFile: video.videoFile,
            duration: video.duration,
            views: video.views,
            owner: video.owner,
            createdAt: video.createdAt,
          },
        },
      })
    );
  } catch (err) {
    return res.status(200).send(
      buildHtmlPage({
        title: "Watch Video - myTube",
        description: "Stream high quality user videos on myTube.",
      })
    );
  }
});

// 2. Server-Side Channel Route Handler (/c/:username or /@:username)
export const renderChannelPage = asyncHandler(async (req, res) => {
  let username = req.params.username;
  if (username && username.startsWith("@")) {
    username = username.slice(1);
  }

  if (!username) {
    return res.status(200).send(
      buildHtmlPage({
        title: "Channels - myTube",
        description: "Discover video channels on myTube.",
      })
    );
  }

  try {
    const user = await User.findOne({ username }).select("fullName username avatar coverImage email");

    if (!user) {
      return res.status(404).send(
        buildHtmlPage({
          title: "Channel Not Found - myTube",
          description: `The channel @${username} does not exist on myTube.`,
        })
      );
    }

    const title = `${user.fullName} (@${user.username}) - myTube Channel`;
    const description = `Check out videos, playlists, and community posts from ${user.fullName} on myTube.`;
    const fullUrl = `${req.protocol}://${req.get("host")}/c/${user.username}`;

    return res.status(200).send(
      buildHtmlPage({
        title,
        description,
        image: user.avatar || user.coverImage,
        url: fullUrl,
        initialData: {
          page: "channel",
          username: user.username,
          user: {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            coverImage: user.coverImage,
          },
        },
      })
    );
  } catch (err) {
    return res.status(200).send(
      buildHtmlPage({
        title: `Channel @${username} - myTube`,
        description: `Explore channel @${username} on myTube.`,
      })
    );
  }
});

// 3. Server-Side Standalone Embed Route Handler (/embed/:videoId)
export const renderEmbedPage = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId).select("videoFile thumbnail title");

    if (!video) {
      return res.status(404).send("<h3>Video not found for embedding.</h3>");
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Embed: ${video.title}</title>
  <style>
    body, html { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
    video { width:100%; height:100%; object-fit:contain; }
  </style>
</head>
<body>
  <video controls autoplay poster="${video.thumbnail}">
    <source src="${video.videoFile}" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send("<h3>Failed to load embedded video player.</h3>");
  }
});

// 4. Server-Side General App Shell Page Handler
export const renderAppShell = asyncHandler(async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  return res.status(200).send(
    buildHtmlPage({
      title: "myTube - Premium Full-Stack Video Platform",
      description: "Stream videos, manage channels, publish community posts, and create video playlists on myTube.",
      url: fullUrl,
      initialData: {
        page: "home",
      },
    })
  );
});
