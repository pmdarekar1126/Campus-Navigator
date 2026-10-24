const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'do', 'does', 'did', 'doing', 'have', 'has', 'had', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'it', 'its', 'they', 'them', 'their', 'to', 'of',
  'in', 'on', 'at', 'for', 'from', 'by', 'with', 'about', 'and', 'or', 'but',
  'if', 'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might',
  'how', 'what', 'when', 'where', 'who', 'whom', 'which', 'why', 'there',
  'here', 'any', 'some', 'get', 'got', 'find', 'tell', 'know', 'please',
  'this', 'that', 'these', 'those', 'as', 'so', 'than', 'then', 'go', 'goes'
]);

module.exports = { STOPWORDS };
