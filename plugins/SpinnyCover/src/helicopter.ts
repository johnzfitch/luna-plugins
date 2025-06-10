const helicopters = [
    "https://media1.tenor.com/m/YYx57mCfY5wAAAAd/helicopter-gooz.gif",
    "https://media0.giphy.com/media/aWXhHFliOBOoZK89iu/giphy.gif",
    "https://media1.tenor.com/m/DBySfrXsgSwAAAAC/cry-about-it-helicopter.gif",
    "https://media.tenor.com/Y49zE8tvq4sAAAAi/jerma-jerma985.gif",
    "https://media1.tenor.com/m/LeyGeJblxm0AAAAC/helicopter-crash.gif",
    "https://media1.tenor.com/m/9e9AI9pEJjcAAAAd/katzenhubschrauber-cat.gif"
]

export function getRandomHelicopterGif(): string {
    return helicopters[Math.floor(Math.random() * helicopters.length)];
}