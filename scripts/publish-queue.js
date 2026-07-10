
const fs = require("fs");

const queueFile = "./queue.json";
const postsFile = "./posts.json";

const queue = JSON.parse(fs.readFileSync(queueFile, "utf8"));
const posts = JSON.parse(fs.readFileSync(postsFile, "utf8"));

const nextPost = queue.find(post => post.published !== true);

if (!nextPost) {
  console.log("No posts waiting to publish.");
  process.exit(0);
}

const publishedPost = {
  id: nextPost.id,
  title: nextPost.title,
  content: nextPost.content,
  date: new Date().toISOString().split("T")[0],
  category: nextPost.category || "Aviation"
};

posts.push(publishedPost);

nextPost.published = true;
nextPost.publishedAt = new Date().toISOString();

fs.writeFileSync(
  postsFile,
  JSON.stringify(posts, null, 2)
);

fs.writeFileSync(
  queueFile,
  JSON.stringify(queue, null, 2)
);

console.log("Published:", publishedPost.title);
