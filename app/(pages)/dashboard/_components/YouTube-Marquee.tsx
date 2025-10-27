"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";

interface VideoItem {
  title: string | undefined;
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high: { url: string };
    };
  };
}

export default function YouTubeCarousel() {
  const [videos, setVideos] = useState<VideoItem[]>([]);

  const autoplayPlugin = Autoplay({
    delay: 5000,
    stopOnInteraction: true,
  });

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const apiUrl =
          "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCytKv8STJiHtO1eSqMP954w&order=date&maxResults=5&key=AIzaSyDHl5hCh6kwyfT1Ei_7Jq3vBP2akIEFX7Q";

        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setVideos(data.items);
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error("Error fetching YouTube videos:", error);
      }
    };

    fetchVideos();
  }, []);

  return (
    <Card className="shadow-lg h-[450px]">
      <CardContent>
        {videos.length > 0 ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin]}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {videos.map((video) => (
                <CarouselItem key={video.id.videoId} className="h-full">
                  <div className="videoSection h-full">
                    <div className="videoThumbnail pt-3 pb-3 flex items-center justify-center h-full">
                      <iframe
                        width="600"
                        height="380"
                        src={`https://www.youtube.com/embed/${video.id.videoId}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={video.title}
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md border border-border hover:bg-accent hover:text-accent-foreground transition-all shadow-md h-10 w-10 rounded-full flex items-center justify-center" />
            <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-md border border-border hover:bg-accent hover:text-accent-foreground transition-all shadow-md h-10 w-10 rounded-full flex items-center justify-center" />
          </Carousel>
        ) : (
          <p>Loading videos...</p>
        )}
      </CardContent>
    </Card>
  );
}
