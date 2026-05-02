/**
 * Generate a random hex color for user avatars
 */
function randomAvatarColor() {
  const colors = [
    '#6C63FF',
    '#FF6B6B',
    '#4ECDC4',
    '#FFD93D',
    '#A8E6CF',
    '#FF8A5C',
    '#EA5455',
    '#7367F0',
    '#28C76F',
    '#00CFE8',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generate a URL-safe slug from a string
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

module.exports = { randomAvatarColor, slugify };
