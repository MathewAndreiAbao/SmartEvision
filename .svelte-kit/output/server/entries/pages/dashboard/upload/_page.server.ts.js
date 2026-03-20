const load = async ({ request }) => {
  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const sharedFile = formData.get("shared_file");
      if (sharedFile instanceof File) {
        return {
          sharedFile: {
            name: sharedFile.name,
            type: sharedFile.type,
            size: sharedFile.size,
            lastModified: sharedFile.lastModified,
            // This is a placeholder since we can't easily pass the binary via devalue
            // The user will see the filename and we'll ask them to re-confirm 
            // or use launchQueue (modern) / client-side re-read.
            isShared: true
          }
        };
      }
    } catch (e) {
      console.error("[upload] Share target error:", e);
    }
  }
  return {
    sharedFile: null
  };
};
export {
  load
};
