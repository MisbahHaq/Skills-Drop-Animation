// import { gsap } from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";
// import Lenis from "lenis";

// document.addEventListener("DOMContentLoaded", () => {
//   gsap.registerPlugin(ScrollTrigger);

//   const lenis = new Lenis();
//   lenis.on("scroll", ScrollTrigger.update);
//   gsap.ticker.add((time) => {
//     lenis.raf(time * 1000);
//   });
//   gsap.ticker.lagSmoothing(0);

//   const animateOnScroll = true;

//   const config = {
//     gravity: { x: 0, y: 1 },
//     restitution: 0.5,
//     friction: 0.15,
//     frictionAir: 0.02,
//     density: 0.002,
//     wallThickness: 200,
//     mouseStiffness: 0.6,
//   };

//   let engine, runner, mouseConstraint;
//   let bodies = [];
//   let topWall = null;

//   function clamp(val, min, max) {
//     return Math.max(min, Math.min(max, val));
//   }

//   function initPhysics(container) {
//     engine = Matter.Engine.create();
//     engine.gravity = config.gravity;
//     engine.constraintIteration = 10;
//     engine.velocityIterations = 16;
//     engine.timing.timeScale = 1;

//     const containerRect = container.getBoundingClientRect();
//     const wallThickness = config.wallThickness;

//     // walls
//     const walls = [
//       Matter.Bodies.rectangle(
//         containerRect.width / 2,
//         containerRect.height + wallThickness / 2,
//         containerRect.width + wallThickness * 2,
//         wallThickness,
//         { isStatic: true }
//       ),
//       Matter.Bodies.rectangle(
//         -wallThickness / 2,
//         containerRect.height / 2,
//         wallThickness,
//         containerRect.height + wallThickness * 2,
//         { isStatic: true }
//       ),
//       Matter.Bodies.rectangle(
//         containerRect.width + wallThickness / 2,
//         containerRect.height / 2,
//         wallThickness,
//         containerRect.height + wallThickness * 2,
//         { isStatic: true }
//       ),
//     ];
//     Matter.World.add(engine.world, walls);

//     const objects = container.querySelectorAll(".object");
//     objects.forEach((obj, index) => {
//       const objRect = obj.getBoundingClientRect();

//       const startX =
//         Math.random() * (containerRect.width - objRect.width) +
//         objRect.width / 2;
//       const startY = -500 - index * 200;
//       const startRotation = (Math.random() - 0.5) * Math.PI;

//       const body = Matter.Bodies.rectangle(
//         startX,
//         startY,
//         objRect.width,
//         objRect.height,
//         {
//           restitution: config.restitution,
//           friction: config.friction,
//           frictionAir: config.frictionAir,
//           density: config.density,
//         }
//       );

//       Matter.Body.setAngle(body, startRotation);

//       bodies.push({
//         body: body,
//         element: obj,
//         width: objRect.width,
//         height: objRect.height,
//       });

//       Matter.World.add(engine.world, body);
//     });

//     // add top wall later
//     setTimeout(() => {
//       topWall = Matter.Bodies.rectangle(
//         containerRect.width / 2,
//         -wallThickness / 2,
//         containerRect.width + wallThickness * 2,
//         wallThickness,
//         { isStatic: true }
//       );
//       Matter.World.add(engine.world, topWall);
//     }, 3000);

//     // mouse control
//     const mouse = Matter.Mouse.create(container);
//     mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
//     mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

//     mouseConstraint = Matter.MouseConstraint.create(engine, {
//       mouse: mouse,
//       constraint: {
//         stiffness: config.mouseStiffness,
//         render: { visible: false },
//       },
//     });

//     mouseConstraint.mouse.element.oncontextmenu = () => false;

//     let dragging = null;
//     let originalInertia = null;

//     Matter.Events.on(mouseConstraint, "startdrag", function (event) {
//       dragging = event.body;
//       if (dragging) {
//         originalInertia = dragging.inertia;
//         Matter.Body.setInertia(dragging, Infinity);
//         Matter.Body.setVelocity(dragging, { x: 0, y: 0 });
//         Matter.Body.setAngularVelocity(dragging, 0);
//       }
//     });

//     Matter.Events.on(mouseConstraint, "enddrag", function () {
//       if (dragging) {
//         Matter.Body.setInertia(dragging, originalInertia || 1);
//         dragging = null;
//         originalInertia = null;
//       }
//     });

//     Matter.Events.on(engine, "beforeUpdate", function () {
//       if (dragging) {
//         const found = bodies.find((b) => b.body === dragging);
//         if (found) {
//           const minX = found.width / 2;
//           const maxX = containerRect.width - found.width / 2;
//           const minY = found.height / 2;
//           const maxY = containerRect.height - found.height / 2;

//           Matter.Body.setPosition(dragging, {
//             x: clamp(dragging.position.x, minX, maxX),
//             y: clamp(dragging.position.y, minY, maxY),
//           });

//           Matter.Body.setVelocity(dragging, {
//             x: clamp(dragging.velocity.x, -20, 20),
//             y: clamp(dragging.velocity.y, -20, 20),
//           });
//         }
//       }
//     });

//     container.addEventListener("mouseleave", () => {
//       mouseConstraint.constraint.bodyB = null;
//       mouseConstraint.constraint.pointB = null;
//     });

//     document.addEventListener("mouseup", () => {
//       mouseConstraint.constraint.bodyB = null;
//       mouseConstraint.constraint.pointB = null;
//     });

//     Matter.World.add(engine.world, mouseConstraint);

//     runner = Matter.Runner.create();
//     Matter.Runner.run(runner, engine);

//     function updatePositions() {
//       bodies.forEach(({ body, element, width, height }) => {
//         const x = clamp(
//           body.position.x - width / 2,
//           0,
//           containerRect.width - width
//         );

//         const y = clamp(
//           body.position.y - height / 2,
//           -height * 3,
//           containerRect.height - height
//         );

//         element.style.left = x + "px";
//         element.style.top = y + "px";
//         element.style.transform = `rotate(${body.angle}rad)`;
//       });

//       requestAnimationFrame(updatePositions);
//     }
//     updatePositions();
//   }

//   if (animateOnScroll) {
//     document.querySelectorAll("section").forEach((section) => {
//       if (section.querySelector(".object-container")) {
//         ScrollTrigger.create({
//           trigger: section,
//           start: "top bottom",
//           once: true,
//           onEnter: () => {
//             const container = section.querySelector(".object-container");
//             if (container && !engine) {
//               initPhysics(container);
//             }
//           },
//         });
//       } else {
//         window.addEventListener("load", () => {
//           const container = document.querySelector(".object-container");
//           if (container) {
//             initPhysics(container);
//           }
//         });
//       }
//     });
//   }
// });

document.addEventListener("DOMContentLoaded", () => {
  // GSAP + ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll
  const lenis = new Lenis({ smooth: true });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  lenis.on("scroll", ScrollTrigger.update);

  // Physics config
  const config = {
    gravity: { x: 0, y: 1 },
    restitution: 0.5,
    friction: 0.15,
    frictionAir: 0.02,
    density: 0.002,
    wallThickness: 200,
    mouseStiffness: 0.6
  };

  let engine, runner, mouseConstraint;
  const bodies = [];

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function initPhysics(container) {
    engine = Matter.Engine.create();
    engine.gravity = config.gravity;

    const rect = container.getBoundingClientRect();

    // Add walls
    const walls = [
      Matter.Bodies.rectangle(rect.width/2, rect.height + config.wallThickness/2,
        rect.width + config.wallThickness*2, config.wallThickness, { isStatic: true }),
      Matter.Bodies.rectangle(-config.wallThickness/2, rect.height/2,
        config.wallThickness, rect.height + config.wallThickness*2, { isStatic: true }),
      Matter.Bodies.rectangle(rect.width + config.wallThickness/2, rect.height/2,
        config.wallThickness, rect.height + config.wallThickness*2, { isStatic: true })
    ];
    Matter.World.add(engine.world, walls);

    // Add objects
    const objects = container.querySelectorAll(".object");
    objects.forEach((obj, i) => {
      const objRect = obj.getBoundingClientRect();
      const body = Matter.Bodies.rectangle(
        Math.random()*(rect.width - objRect.width)+objRect.width/2,
        -500 - i*200,
        objRect.width,
        objRect.height,
        { restitution: config.restitution, friction: config.friction, frictionAir: config.frictionAir, density: config.density }
      );
      Matter.Body.setAngle(body, (Math.random()-0.5)*Math.PI);
      Matter.World.add(engine.world, body);
      bodies.push({ body, element: obj, width: objRect.width, height: objRect.height });
    });

    // Mouse/touch control
    const mouse = Matter.Mouse.create(container);
    mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: config.mouseStiffness, render: { visible: false } }
    });

    // Remove scroll interference
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

    // Touch support
    mouse.element.addEventListener("touchstart", mouse.mouseup);
    mouse.element.addEventListener("touchmove", mouse.mousemove);
    mouse.element.addEventListener("touchend", mouse.mouseup);

    Matter.World.add(engine.world, mouseConstraint);

    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Render loop
    function update() {
      bodies.forEach(({ body, element, width, height }) => {
        element.style.left = clamp(body.position.x - width/2, 0, rect.width - width) + "px";
        element.style.top = clamp(body.position.y - height/2, -height*3, rect.height - height) + "px";
        element.style.transform = `rotate(${body.angle}rad)`;
      });
      requestAnimationFrame(update);
    }
    update();
  }

  // Initialize on scroll or immediately
  const container = document.querySelector(".object-container");
  if(container) {
    ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      onEnter: () => initPhysics(container),
      once: true
    });
  }
});

