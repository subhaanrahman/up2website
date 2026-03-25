import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Image, X, UserPlus } from "lucide-react";
import { postsRepository } from "@/features/social/repositories/postsRepository";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validateImageFileOrMessage } from "@/utils/fileValidation";
import GifPicker from "@/components/GifPicker";
import CollaboratorPicker from "@/components/CollaboratorPicker";
import { uploadPostImage } from "@/features/media";

interface PostComposerProps {
  displayName: string;
  username: string;
  avatarUrl: string;
  organiserProfileId?: string;
  isVerified?: boolean;
  onPostCreated?: () => void;
}

const PostComposer = ({ displayName, username, avatarUrl, organiserProfileId, isVerified, onPostCreated }: PostComposerProps) => {
  const { user } = useAuth();
  const [isComposing, setIsComposing] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
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
    const err = validateImageFileOrMessage(file);
    if (err) {
      toast.error(err);
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSelectedGif(null);
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

  const addCollaborator = (collab: { user_id: string; display_name: string; avatar_url: string | null }) => {
    if (!collaborators.find(c => c.user_id === collab.user_id)) {
      setCollaborators(prev => [...prev, collab]);
    }
    setShowCollabPicker(false);
  };

  const removeCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(c => c.user_id !== userId));
  };

  const handlePost = async () => {
    if (!user) return;
    const hasContent = postText.trim() || selectedImage || selectedGif;
    if (!hasContent) return;

    setPosting(true);
    let imageUrl: string | null = null;

    try {
      if (selectedImage) {
        const result = await uploadPostImage(selectedImage);
        imageUrl = result.url;
      }

      const newPost = await postsRepository.createPost({
        authorId: user.id,
        content: postText.trim() || null,
        organiserProfileId: organiserProfileId || null,
        imageUrl,
        gifUrl: selectedGif,
      });

      if (collaborators.length > 0) {
        await postsRepository.addCollaborators(newPost.id, collaborators.map(c => c.user_id));
      }

      setPostText("");
      clearMedia();
      setCollaborators([]);
      setIsComposing(false);
      onPostCreated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    }
    setPosting(false);
  };

  const hasContent = postText.trim() || selectedImage || selectedGif;

  return (
    <div ref={composerRef} className="border-b border-border w-full">
      <div className="px-4 py-3">
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
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <Link to="/profile" className="font-semibold text-[15px] text-foreground hover:underline leading-tight truncate shrink-0">
              {displayName}
            </Link>
            {isVerified && <BadgeCheck className="h-[15px] w-[15px] text-primary fill-primary [&>path:last-child]:text-primary-foreground shrink-0" />}
            <span className="text-muted-foreground text-[15px] truncate">@{username}</span>
          </div>

          {isComposing ? (
            <div className="mt-1.5 animate-in fade-in slide-in-from-top-2 duration-200 fill-mode-both">
              <textarea
                ref={textareaRef}
                value={postText}
                onChange={handleTextChange}
                placeholder="What's happening?"
                rows={1}
                className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground resize-none outline-none leading-[1.45]"
                style={{ minHeight: "24px" }}
              />


              {imagePreview && (
                <div className="relative mt-2 rounded-tile overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  <button onClick={clearMedia} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              )}

              {selectedGif && (
                <div className="relative mt-2 rounded-tile overflow-hidden border border-border">
                  <img src={selectedGif} alt="GIF" className="w-full max-h-64 object-cover" />
                  <button onClick={clearMedia} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
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
                      setCollaborators([]);
                      setShowCollabPicker(false);
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
              className="text-muted-foreground text-[15px] cursor-pointer mt-0.5 animate-in fade-in duration-150 fill-mode-both"
              onClick={() => setIsComposing(true)}
            >
              Write Something...
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PostComposer;
