// worker (stark angepasste Version für FormData und Audio)
export default {
    async fetch(request, env) {
      // 1. API-Schlüssel sicher holen
      const geminiApiKey = env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return new Response(JSON.stringify({ error: 'API Key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders('*') } }); // CORS auch bei Fehlern
      }
  
      // CORS Header (wird jetzt öfter gebraucht)
      // Erlaubt Anfragen von JEDER Herkunft -> In Produktion anpassen!
      const origin = request.headers.get('Origin') || '*';
      const corsHeaders = createCorsHeaders(origin); // Funktion siehe unten
  
      // Handle Preflight (OPTIONS) Requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      // Nur POST erlauben
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders }});
      }
  
      try {
          let promptText = "";
          let audioBase64 = null;
          let audioMimeType = null;
          let requestType = 'unknown'; // 'text' oder 'audio'
  
          // Prüfen, ob es FormData (mit Audio) oder JSON (nur Text) ist
          const contentType = request.headers.get('Content-Type') || '';
  
          if (contentType.includes('multipart/form-data')) {
              requestType = 'audio';
              console.log('Received FormData (likely audio)');
              const formData = await request.formData();
              promptText = formData.get('prompt');
              const audioFile = formData.get('audioFile'); // Ist ein File/Blob Objekt
  
              if (!promptText || !audioFile) {
                   throw new Error('Missing prompt or audioFile in FormData');
              }
  
              // Audio-Datei in ArrayBuffer umwandeln und dann Base64 kodieren
              const audioBuffer = await audioFile.arrayBuffer();
              audioBase64 = arrayBufferToBase64(audioBuffer); // Funktion siehe unten
              audioMimeType = audioFile.type || 'audio/webm'; // Nimm den Typ vom Blob, fallback webm
              console.log(`Received audio: ${audioMimeType}, Size: ${audioBuffer.byteLength} bytes`);
  
          } else if (contentType.includes('application/json')) {
              requestType = 'text';
              console.log('Received JSON (likely text only)');
              const jsonBody = await request.json();
              promptText = jsonBody.prompt;
              if (!promptText) {
                  throw new Error('Missing prompt in JSON body');
              }
          } else {
              throw new Error(`Unsupported Content-Type: ${contentType}`);
          }
  
          // Gemini API Request Body zusammenbauen
          let geminiContents = [];
          geminiContents.push({ text: promptText }); // Text-Prompt immer hinzufügen
  
          if (requestType === 'audio' && audioBase64 && audioMimeType) {
               // Wenn Audio dabei war, als inlineData hinzufügen
               geminiContents.push({
                  inlineData: {
                      mimeType: audioMimeType, // Verwende den erkannten MIME-Typ
                      data: audioBase64,
                  },
               });
          }
  
          // Entscheide, welches Modell basierend auf Input verwendet wird
          // Flash kann oft beides, aber explizit sein ist sicherer
          // HINWEIS: Prüfe die genauen Modellnamen für multimodale Fähigkeiten!
          // 'gemini-pro' ist oft für Text, 'gemini-pro-vision' für Bilder,
          // 'gemini-1.5-flash' (oder pro) könnte Audio besser können.
          // Wir versuchen es mit 'gemini-1.5-flash-latest', da es Audio besser unterstützt
          const modelName = 'gemini-1.5-flash-latest'; // Oder 'gemini-pro' falls nur Text
          const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
          console.log(`Using model: ${modelName}`);
  
  
          const geminiRequestBody = { contents: geminiContents };
  
          // Anfrage an Gemini senden
          console.log('Sending request to Gemini API...');
          const geminiResponse = await fetch(geminiApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiRequestBody),
          });
  
          const geminiData = await geminiResponse.json();
  
          if (!geminiResponse.ok) {
              console.error('Gemini API Error:', JSON.stringify(geminiData));
              throw new Error(`Gemini API Error (${geminiResponse.status}): ${geminiData?.error?.message || 'Unknown Gemini Error'}`);
          }
  
          // Antwort extrahieren (nur Text erwartet)
          const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          console.log('Received text from Gemini:', generatedText ? generatedText.substring(0, 50) + '...' : 'No text received');
  
  
          if (generatedText) {
               // Erfolgreiche Antwort zurück ans Frontend
               return new Response(JSON.stringify({ generatedText: generatedText.trim() }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
               });
          } else {
               throw new Error('Could not extract text from Gemini response');
          }
  
      } catch (e) {
          console.error("Worker Error:", e);
          return new Response(JSON.stringify({ error: `Worker error: ${e.message}` }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders } // CORS auch bei Fehlern!
          });
      }
    },
  };
  
  // --- Hilfsfunktionen für den Worker ---
  
  // Erzeugt CORS Header
  function createCorsHeaders(origin = '*') {
      return {
        'Access-Control-Allow-Origin': origin, // Dynamisch oder '*'
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', // Erlaube diesen Header
      };
  }
  
  
  // Konvertiert ArrayBuffer zu Base64 String
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // in Vercel/Node: return Buffer.from(buffer).toString('base64');
    // in Cloudflare Worker / Browser:
    return btoa(binary);
  }