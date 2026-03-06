import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import GifPicker from "@/components/GifPicker";

interface PostComposerProps {
  displayName: string;
  username: string;
  avatarUrl: string;
  organiserProfileId?: string;
  onPostCreated?: () => void;
}

const PostComposer = ({ displayName, username, avatarUrl, organiserProfileId, onPostCreated }: PostComposerProps) => {
  const { user } = useAuth();
  const [isComposing, setIsComposing] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isComposing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isComposing]);

  useEffect(() => {
    if (!isComposing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        if (!postText.trim() && !selectedImage && !selectedGif) {
          setIsComposing(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isComposing, postText, selectedImage, selectedGif]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSelectedGif(null); // can't have both
    setIsComposing(true);
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGif(gifUrl);
    setSelectedImage(null);
    setImagePreview(null);
    setIsComposing(true);
  };

  const clearMedia = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedGif(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!user) return;
    const hasContent = postText.trim() || selectedImage || selectedGif;
    if (!hasContent) return;

    setPosting(true);
    let imageUrl: string | null = null;

    try {
      // Upload image if selected
      if (selectedImage) {
        const ext = selectedImage.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(path, selectedImage, { contentType: selectedImage.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        content: postText.trim() || null,
        organiser_profile_id: organiserProfileId || null,
        image_url: imageUrl,
        gif_url: selectedGif,
      });

      if (error) throw error;

      setPostText("");
      clearMedia();
      setIsComposing(false);
      onPostCreated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    }
    setPosting(false);
  };

  const hasContent = postText.trim() || selectedImage || selectedGif;

  return (
    <div ref={composerRef} className="px-4 py-3 border-b border-border">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
      <div className="flex gap-3">
        <Link to="/profile">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-card text-foreground font-bold text-sm">
              {displayName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link to="/profile" className="font-semibold text-[15px] text-foreground hover:underline leading-tight">
              {displayName}
            </Link>
            <BadgeCheck className="h-[15px] w-[15px] text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
            <span className="text-muted-foreground text-[13px]">@{username}</span>
          </div>

          {isComposing ? (
            <div className="mt-1.5 transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={postText}
                onChange={handleTextChange}
                placeholder="What's happening?"
                rows={1}
                className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground resize-none outline-none leading-[1.45]"
                style={{ minHeight: "24px" }}
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-2 rounded-2xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  <button
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1"
                  >
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              )}

              {/* GIF preview */}
              {selectedGif && (
                <div className="relative mt-2 rounded-2xl overflow-hidden border border-border">
                  <img src={selectedGif} alt="GIF" className="w-full max-h-64 object-cover" />
                  <button
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1"
                  >
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-[18px] w-[18px]" />
                  </Button>
                  <GifPicker onSelect={handleGifSelect} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground text-[13px]"
                    onClick={() => {
                      setIsComposing(false);
                      setPostText("");
                      clearMedia();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full px-4 text-[13px]"
                    disabled={!hasContent || posting}
                    onClick={handlePost}
                  >
                    {posting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p
              className="text-muted-foreground text-[15px] cursor-pointer mt-0.5"
              onClick={() => setIsComposing(true)}
            >
              Write Something...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
