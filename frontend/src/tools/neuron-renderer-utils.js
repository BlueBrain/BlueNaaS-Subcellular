
function disposeMesh(obj) {
  obj.geometry.dispose();
  obj.material.dispose();
}

export default {
  disposeMesh,
};
