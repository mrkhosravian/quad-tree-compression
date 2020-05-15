<script>
    import { onMount } from "svelte";
    import {image} from "./imageStore";

    let canvas;

    onMount(() => {
        let ctx = canvas.getContext("2d");
        image.set(ctx);
    });

    // image.baseCanvas.subscribe(value => {
    //     ctx = value;
    // })

    // image.set(0)

  const handleFileUpload = () => {
    document.getElementById("file").click();
  };
</script>

<canvas bind:this={canvas} id="canvas" width="600" height="600" on:click={handleFileUpload} />