import test from "node:test";
import assert from "node:assert/strict";
import { youtubeLinkVideo, resolveYouTubeLink } from "./youtube-link";
const id="dQw4w9WgXcQ";
test("watch, share, Shorts, live and bare IDs produce the same safe queue item", () => {
  for (const input of [id,`https://youtu.be/${id}?si=share`,`https://www.youtube.com/watch?v=${id}&list=ignored`,`https://youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`]) {
    const item=youtubeLinkVideo(input); assert.equal(item?.id,id); assert.equal(item?.watchUrl,`https://www.youtube.com/watch?v=${id}`); assert.equal(item?.durationSeconds,0);
  }
  for (const input of ["", "https://example.com/watch?v="+id, "https://youtube.com/playlist?list=abc", "javascript:alert(1)"]) assert.equal(youtubeLinkVideo(input),null);
});
test("link metadata uses only oEmbed, not Search or Data API", async () => {
  const item=await resolveYouTubeLink(id,async (url)=>{
    assert.equal(new URL(String(url)).origin,"https://www.youtube.com");
    assert.equal(new URL(String(url)).pathname,"/oembed");
    return Response.json({title:" Video title ",author_name:"Channel",html:"<script>ignored</script>",thumbnail_url:"https://evil.example/image"});
  });
  assert.equal(item?.title,"Video title"); assert.equal(item?.channel,"Channel"); assert.equal(new URL(item!.thumbnail).hostname,"i.ytimg.com");
});
test("429, timeout and malformed metadata never block adding a valid link", async () => {
  const fallback=youtubeLinkVideo(id);
  for(const fetcher of [async()=>new Response(null,{status:429}),async()=>{throw new Error("timeout")},async()=>new Response("not JSON"),async()=>Response.json({title:123})]) assert.deepEqual(await resolveYouTubeLink(id,fetcher),fallback);
  let called=false;
  assert.equal(await resolveYouTubeLink("invalid",async()=>{called=true;return Response.json({})}),null);
  assert.equal(called,false);
});
