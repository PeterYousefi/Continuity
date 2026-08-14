export interface Scene {
  id: string;
  title: string;
  description: string;
}

export interface StoryboardCard {
  scene: Scene;
  prompt: string;
  status: "pending" | "active" | "done" | "error";
  dataUri?: string;
  errorMessage?: string;
}
