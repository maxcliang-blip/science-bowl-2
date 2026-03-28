export default async function handler(req, res) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch('https://example.com', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    return res.status(200).json({ 
      success: true, 
      status: response.status 
    });
  } catch (error) {
    clearTimeout(timeout);
    return res.status(500).json({ 
      error: error.message,
      name: error.name,
      type: error.type
    });
  }
}
