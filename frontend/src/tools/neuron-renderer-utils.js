
import {
  Mesh,
  Vector3,
  Geometry,
  BufferGeometry,
  SphereBufferGeometry,
  CylinderGeometry,
  Matrix4,
  MeshLambertMaterial,
  Color,
  DoubleSide,
} from 'three';

import last from 'lodash/last';
import chroma from 'chroma-js';

const HALF_PI = Math.PI * 0.5;

const baseMorphColors = {
  soma: chroma('#A9A9A9'),
  axon: chroma('#0080FF'),
  apic: chroma('#C184C1'),
  dend: chroma('#FF0033'),
  myelin: chroma('#F5F5F5'),
};


function disposeMesh(obj) {
  obj.geometry.dispose();
  obj.material.dispose();
}

function createSecGeometryFromPoints(pts, simplificationRatio = 2) {
  const sRatio = simplificationRatio;

  const secGeometry = new Geometry();

  for (let i = 0; i < pts.length - 1; i += sRatio) {
    const vstart = new Vector3(pts[i][0], pts[i][1], pts[i][2]);
    const vend = new Vector3(
      pts[i + sRatio] ? pts[i + sRatio][0] : last(pts)[0],
      pts[i + sRatio] ? pts[i + sRatio][1] : last(pts)[1],
      pts[i + sRatio] ? pts[i + sRatio][2] : last(pts)[2],
    );
    const distance = vstart.distanceTo(vend);
    const position = vend.clone().add(vstart).divideScalar(2);

    const dStart = pts[i][3] * 2;
    const dEnd = (pts[i + sRatio] ? pts[i + sRatio][3] : last(pts)[3]) * 2;

    const geometry = new CylinderGeometry(
      dStart,
      dEnd,
      distance,
      Math.max(5, Math.ceil(24 / sRatio)),
      1,
      true,
    );

    const orientation = new Matrix4();
    const offsetRotation = new Matrix4();
    orientation.lookAt(vstart, vend, new Vector3(0, 1, 0));
    offsetRotation.makeRotationX(HALF_PI);
    orientation.multiply(offsetRotation);
    geometry.applyMatrix(orientation);

    const cylinder = new Mesh(geometry);
    cylinder.position.copy(position);
    cylinder.updateMatrix();

    secGeometry.merge(cylinder.geometry, cylinder.matrix);
    disposeMesh(cylinder);
  }

  const secBufferGeometry = new BufferGeometry().fromGeometry(secGeometry);
  secGeometry.dispose();

  return secBufferGeometry;
}

function createSecMeshFromPoints(pts, material, simplificationRatio) {
  const geometry = createSecGeometryFromPoints(pts, simplificationRatio);
  return new Mesh(geometry, material);
}

function getSomaPositionFromPoints(pts) {
  let position;

  if (pts.length === 1) {
    position = new Vector3().fromArray(pts[0]);
  } else if (pts.length === 3) {
    position = new Vector3().fromArray(pts[0]);
  } else {
    position = pts
      .reduce((vec, pt) => vec.add(new Vector3().fromArray(pt)), new Vector3())
      .divideScalar(pts.length);
  }

  return position;
}

function getSomaRadiusFromPoints(pts) {
  const position = getSomaPositionFromPoints(pts);
  let radius;

  if (pts.length === 1) {
    radius = pts[0][3];
  } else if (pts.length === 3) {
    const secondPt = new Vector3().fromArray(pts[1]);
    const thirdPt = new Vector3().fromArray(pts[2]);
    radius = (position.distanceTo(secondPt) + position.distanceTo(thirdPt)) / 2;
  } else {
    radius = Math.max(...pts.map(pt => position.distanceTo(new Vector3().fromArray(pt))));
  }

  return radius;
}

function createSomaMeshFromPoints(pts, material) {
  const position = getSomaPositionFromPoints(pts);
  const radius = getSomaRadiusFromPoints(pts);

  const geometry = new SphereBufferGeometry(radius, 14, 14);
  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.updateMatrix();

  return mesh;
}

function generateSecMaterialMap(colorDiff = 0) {
  const materialMap = Object.entries(baseMorphColors).reduce((map, [secType, chromaColor]) => {
    const glColor = chromaColor
      .brighten(colorDiff)
      .desaturate(colorDiff)
      .gl();

    const color = new Color(...glColor);
    const material = new MeshLambertMaterial({ color, transparent: true });
    material.side = DoubleSide;

    return Object.assign(map, { [secType]: material });
  }, {});

  return materialMap;
}

export default {
  createSecMeshFromPoints,
  disposeMesh,
  createSomaMeshFromPoints,
  getSomaPositionFromPoints,
  getSomaRadiusFromPoints,
  generateSecMaterialMap,
};
