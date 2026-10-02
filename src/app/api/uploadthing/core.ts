import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for url:", file.url);
      
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: "user" };
    }),
  documentUploader: f({ pdf: { maxFileSize: "16MB" }, blob: { maxFileSize: "16MB" } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document upload complete for url:", file.url);
      return { uploadedBy: "user" };
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
