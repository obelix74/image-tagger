Image tagger.

A problem that every photographer ends up facing:  

- How do you use natural language to describe your images?
- How do you use that language to optimize your images for search engines?
- How do you use that language to create captions for social media?
- How do you use that language to create alt text for accessibility?
- How do you use that language to create titles for your images?
- How do you use that language to create descriptions for your images?
- How do you use that language to create tags for your images?

All RAW image formats solve this problem by using EXIF and IPTC tags. These are metadata fields that can be added to the image file itself. 

I have tried to solve this problem by writing code. https://github.com/obelix74/damage is a ruby based tool that uses exiftool to read and write EXIF and IPTC tags. It uses `rmagick` to resize images to create thumbnails and store all the metadata in a database. 

Of course this is dependent on me tagging all these correctly when I import these images. While I do that after each photo shoot, I can only do basic information such as location, some meta information "JMT section hike 2024 from Kearsarge Pass" and so on. I use a commercial software for managing these metadata called Photo Mechanic Plus. Like every software vendor, they are switching to a subscription model. 

Ideally I want to do better than human entered metadata. I started using ChatGPT to analyze my images and metadata and manually copy the metadata over to the image files. This is a time consuming process and I am not consistent with it. Some times, I will simply upload the metadata to the image backend for www.anands.net and not bother with the image files at all. 

ArtStoreFronts, the vendor who runs my online gallery and my social media accounts created ArtHelper.ai, which automates this process. It uses AI to analyze the image and generate metadata. It is a paid service, and I signed up for a few months.

My friend, Krishna suggested I should write this on my own.  That brings me to today.

I looked at all the options available and chose the Gemini AI API's image analysis API. I started with this prompt. 

"I want to use the Gemini AI API to analyze images and generate a description of the photograph, a caption and SEO optimized keywords.

The photos can be in JPG, TIFF or RAW format. If they are in RAW format, then extract the preview JPG from the raw files.

The images should be resized to smaller size before they are sent to Gemini AI API for analysis.

The metadata returned from Gemini AI API should be written to a local database against the name of the image.

Use Typescript for this. Keep the architecture as simple as possible. 

Write GUI for this in React.JS.  Maybe show a thumbnail of images processed and the details from Gemini AI API."

I asked Gemini CLI AI to write the code for me. It wrote a pretty good client and server implementation, but the implementation was buggy and I couldn't get it to work reliably.

I then asked the VS Code Augment plugin to write the same. It wrote both the server and client side code, gave me clear instructions on how to get a API key from Gemini AI API and how to run the code. The code works flawlessly. 

I am pretty happy with the result. Attached screenshots of the application in action.  My next stage would be to automate this for my entire image catalog and implement a search engine around this, once I figure out the cost of using Gemini AI API for 1000s of images.

Given my experiences so far, I think I am going to settle down on Augment Code even for personal projects. Augment continues to stun me with its capabilities.