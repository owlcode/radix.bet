<div class="wave-transition">
  <svg
    class="wave-svg wave1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1440 130"
    preserveAspectRatio="none"
  >
    <path
      d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z"
      fill="#111827"
    />
  </svg>
  <svg
    class="wave-svg wave2"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1440 130"
    preserveAspectRatio="none"
  >
    <path
      d="M0,80 C360,20 720,100 1080,40 C1260,10 1380,50 1440,70 L1440,120 L0,120 Z"
      fill="#111827"
    />
  </svg>
  <svg
    class="wave-svg wave3"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1440 90"
    preserveAspectRatio="none"
  >
    <path
      d="M0,90 C180,50 360,100 540,70 C720,40 900,90 1080,60 C1260,30 1380,80 1440,50 L1440,120 L0,120 Z"
      fill="#111827"
    />
  </svg>
  <div class="wave-solid"></div>
</div>

<style lang="scss">
  .wave-transition {
    position: relative;
    width: 100%;
    height: 140px;
    background: transparent;
    overflow: hidden;
  }

  .wave-svg {
    position: absolute;
    bottom: 0;
    left: -50vw;
    width: calc(100% + 100vw);
    height: 100%;
    display: block;
  }

  .wave1 {
    z-index: 1;
    opacity: 0.3;
    animation: wave-sway 10s ease-in-out infinite;
  }

  .wave2 {
    z-index: 2;
    opacity: 0.6;
    animation: wave-sway-reverse 6s ease-in-out infinite;
  }

  .wave3 {
    z-index: 3;
    opacity: 1;
    animation: wave-sway 8s ease-in-out infinite;
    animation-delay: -2s;
  }

  .wave-solid {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: #111827;
    z-index: 4;
  }

  @keyframes wave-sway {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(-25vw);
    }
  }

  @keyframes wave-sway-reverse {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(25vw);
    }
  }
</style>
