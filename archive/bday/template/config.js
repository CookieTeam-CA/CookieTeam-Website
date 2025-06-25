const pageConfig = {
    // An wen richtet sich diese Seite? "mace" oder "basby"
    // (Wichtig, damit der "Zurück"-Button funktioniert)
    recipient: "mace", 

    // Wer ist der Absender und was ist die Überschrift?
    from: "Froggy",
    title: "Eine kleine Überraschung!",

    // Hier alle Inhaltsblöcke einfügen
    contentBlocks: [
        {
            type: "text",
            content: "Hey, alles Gute zum Geburtstag! Ich hoffe, du hast einen fantastischen Tag. Hier sind ein paar Dinge, die mich an unsere gemeinsame Zeit erinnern. Prost! 🍻"
        },
        {
            type: "image",
            content: "../assets/images/sample.jpg", // Pfad zum Bild im assets/images Ordner
            caption: "Weißt du noch? Der Ausflug letztes Jahr!"
        },
        {
            type: "video",
            // YouTube: Geh auf "Teilen" -> "Einbetten" und kopiere den Link aus dem src="" Attribut
            content: "https://www.youtube.com/embed/dQw4w9WgXcQ"
        },
        {
            type: "tiktok",
            // TikTok: Klick auf "Einbetten" und kopiere die blockquote-cite URL
            content: "https://www.tiktok.com/@gordonramsayofficial/video/7323868055234841889"
        },
        {
            type: "link",
            url: "https://open.spotify.com/playlist/37i9dQZF1DWZJmo9yptn2A",
            text: "Unser gemeinsamer Soundtrack"
        }
    ]
};