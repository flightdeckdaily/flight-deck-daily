// Vercel serverless function.
// Receives a post from the admin form, appends it to posts.json,
// and commits the change directly to your GitHub repo.
// Vercel then auto-redeploys your site with the new post live.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, post } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  if (!post || !post.title || !post.body) {
    return res.status(400).json({ error: 'Post must include at least a title and body' });
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const filePath = 'posts.json';

  if (!owner || !repo || !token) {
    return res.status(500).json({ error: 'Server is missing GitHub configuration' });
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Get current posts.json content + sha
    const getRes = await fetch(apiUrl, { headers });
    if (!getRes.ok) {
      const errText = await getRes.text();
      return res.status(502).json({ error: `Couldn't read posts.json from GitHub: ${errText}` });
    }
    const getData = await getRes.json();
    const currentContent = Buffer.from(getData.content, 'base64').toString('utf-8');
    const posts = JSON.parse(currentContent);

    // 2. Build the new post
    const nextNumber = posts.length + 1;
    const id = `FDD-${String(nextNumber).padStart(3, '0')}`;
    const slug = (post.slug && post.slug.trim())
      ? post.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newPost = {
      id,
      slug,
      title: post.title,
      type: post.type || 'Blog',
      beat: post.beat || 'Flight Deck Daily',
      date: post.date || new Date().toISOString().split('T')[0],
      tags: Array.isArray(post.tags) ? post.tags : (post.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      excerpt: post.excerpt || post.body.slice(0, 140).trim() + '…',
      body: post.body,
    };

    const updatedPosts = [...posts, newPost];
    const updatedContent = Buffer.from(JSON.stringify(updatedPosts, null, 2)).toString('base64');

    // 3. Commit the updated file back to GitHub
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Add post ${id}: ${post.title}`,
        content: updatedContent,
        sha: getData.sha,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(502).json({ error: `Couldn't save to GitHub: ${errText}` });
    }

    return res.status(200).json({ success: true, id, slug });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
