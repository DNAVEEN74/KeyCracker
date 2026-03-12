export async function fetchTcsIonResponseSheet(url: string): Promise<{ content: string; contentType: string }> {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw new Error('Invalid URL protocol');
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Add some default headers to reduce chance of blocking
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL. Status: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'text/html';
        const content = await response.text();

        return {
            content,
            contentType
        };
    } catch (error) {
        console.error('Error fetching TCS iON URL:', error);
        throw new Error(`Failed to fetch response sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
