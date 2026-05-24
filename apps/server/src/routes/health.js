export const healthRoute = async (app) => {
    app.get("/health", async () => {
        return {
            name: "sync-tool-server",
            status: "ok",
            uptime: process.uptime()
        };
    });
};
