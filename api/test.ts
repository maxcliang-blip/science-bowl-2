export default async function handler(req, res) {
  console.log('[Test] Request received');
  
  try {
    console.log('[Test] Attempting fetch...');
    const response = await fetch('https://example.com');
    console.log('[Test] Fetch successful');
    
    const text = await response.text();
    console.log('[Test] Response length:', text.length);
    
    return res.status(200).json({ 
      success: true, 
      length: text.length,
      preview: text.substring(0, 200)
    });
  } catch (error) {
    console.error('[Test] Error:', error);
    return res.status(500).json({ 
      error: error.message,
      name: error.name
    });
  }
}
