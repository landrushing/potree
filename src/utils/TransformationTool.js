

import {Utils} from "../utils.js";

export class TransformationTool {
	constructor(viewer) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();
		this.dragging = false;
		this.showPickVolumes = false;

		this.viewer.inputHandler.registerInteractiveScene(this.scene);
		this.viewer.inputHandler.addEventListener('selection_changed', (e) => {
			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.delete(selected);
			}

			this.selection = e.selection;

			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.add(selected);
			}

		});

		let red = 0xE73100;
		let green = 0x44A24A;
		let blue = 0x2669E7;

		this.activeHandle = null;
		this.scaleHandles = {
			"scale.x+": {name: "scale.x+", node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
			"scale.x-": {name: "scale.x-", node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
			"scale.y+": {name: "scale.y+", node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
			"scale.y-": {name: "scale.y-", node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
			"scale.z+": {name: "scale.z+", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
			"scale.z-": {name: "scale.z-", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
		};
		this.translationHandles = {
			"translation.x": {name: "translation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
			"translation.y": {name: "translation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
			"translation.z": {name: "translation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
		};
		this.handles = Object.assign({}, this.scaleHandles, this.translationHandles);
		this.pickVolumes = [];

		this.initializeScaleHandles();
		this.initializeTranslationHandles();


		let boxFrameGeometry = new THREE.Geometry();
		{
			// bottom
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			// top
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			// sides
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
		}
		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0xffff00}));
		this.scene.add(this.frame);


	}

	initializeScaleHandles(){
		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];
			let node = handle.node;
			this.scene.add(node);
			node.position.set(...handle.alignment).multiplyScalar(0.5);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
				});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes});

			let sphere = new THREE.Mesh(sgSphere, material);
			sphere.scale.set(1.3, 1.3, 1.3);
			sphere.name = `${handleName}.handle`;
			node.add(sphere);

			let outline = new THREE.Mesh(sgSphere, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			outline.name = `${handleName}.outline`;
			sphere.add(outline);

			let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			sphere.add(pickSphere);
			pickSphere.handle = handleName;
			this.pickVolumes.push(pickSphere);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					sphere.visible = opacity.x > 0;
					pickSphere.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickSphere.material.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
			pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));

			pickSphere.addEventListener("mouseover", e => {
				//node.setOpacity(1);
			});

			pickSphere.addEventListener("click", e => {
				e.consume();
			});

			pickSphere.addEventListener("mouseleave", e => {
				//node.setOpacity(0.4);
			});
		}
	}

	initializeTranslationHandles(){
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			this.scene.add(node);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			let box = new THREE.Mesh(boxGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(0.2, 0.2, 40);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			box.renderOrder = 10;
			node.add(box);
			handle.translateNode = box;

			let outline = new THREE.Mesh(boxGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(3, 3, 1.03);
			outline.renderOrder = 0;
			box.add(outline);

			let pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(12, 12, 1.1);
			pickVolume.handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					box.visible = opacity.x > 0;
					pickVolume.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			pickVolume.addEventListener("drag", (e) => {this.dragTranslationHandle(e)});
			pickVolume.addEventListener("drop", (e) => {this.dropTranslationHandle(e)});
		}
	}

	dragTranslationHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();

		if(!drag.intersectionStart && handle){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());

			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		{
			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			let I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

				for (let selection of this.selection) {
					selection.position.add(diff);
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
				}

				drag.pivot = drag.pivot.add(diff);
			}
		}
	}

	dropTranslationHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dropScaleHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragScaleHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();

		if(!drag.intersectionStart){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());
			drag.handle = handle;

			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;

			//Utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		{
			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			let I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());
				let direction = handle.alignment.reduce( (a, v) => a + v, 0);

				let toObjectSpace = new THREE.Matrix4().getInverse( this.selection[0].matrixWorld);
				let iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
				let pivotOS = drag.pivot.clone().applyMatrix4(toObjectSpace);
				let diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
				let dragDirectionOS = diffOS.clone().normalize();
				if(iOnLine.distanceTo(drag.pivot) === 0){
					dragDirectionOS.set(0, 0, 0);
				}
				let dragDirection = dragDirectionOS.dot(new THREE.Vector3(...handle.alignment));

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);
				let diffScale = new THREE.Vector3(...handle.alignment).multiplyScalar(diff.length() * direction * dragDirection);
				let diffPosition = diff.clone().multiplyScalar(0.5);

				for (let selection of this.selection) {
					selection.scale.add(diffScale);
					selection.scale.x = Math.max(0.1, selection.scale.x);
					selection.scale.y = Math.max(0.1, selection.scale.y);
					selection.scale.z = Math.max(0.1, selection.scale.z);
					selection.position.add(diffPosition);
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
					selection.dispatchEvent({
						type: "scale_changed",
						object: selection
					});
				}

				drag.pivot.copy(iOnLine);
				//Utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
			}
		}
	}

	setActiveHandle(handle){
		if(this.dragging){
			return;
		}

		if(this.activeHandle === handle){
			return;
		}

		this.activeHandle = handle;

		if(handle === null){
			for(let handleName of Object.keys(this.handles)){
				let handle = this.handles[handleName];
				handle.node.setOpacity(0);
			}
		}


		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.translationHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);
			}else{
				handle.node.setOpacity(0.4)
			}
		}

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);

				for(let translationHandleName of Object.keys(this.translationHandles)){
					let translationHandle = this.translationHandles[translationHandleName];
					translationHandle.node.setOpacity(0.4);
				}

				//let relatedTranslationHandle = this.translationHandles[
				//	handle.name.replace("scale", "translation").replace(/[+-]/g, "")];
				//let relatedTranslationNode = relatedTranslationHandle.node;
				//relatedTranslationNode.setOpacity(0.4);


			}else{
				handle.node.setOpacity(0.4)
			}
		}





		if(handle){
			handle.node.setOpacity(1.0);
		}


	}

	update () {

		if(this.selection.length === 1){

			this.scene.visible = true;

			this.scene.updateMatrix();
			this.scene.updateMatrixWorld();

			let selected = this.selection[0];
			let world = selected.matrixWorld;
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.viewer.renderer.domElement;
			let mouse = this.viewer.inputHandler.mouse;

			let center = selected.boundingBox.getCenter(new THREE.Vector3()).clone().applyMatrix4(selected.matrixWorld);

			this.scene.scale.copy(selected.boundingBox.getSize(new THREE.Vector3()).multiply(selected.scale));
			this.scene.position.copy(center);

			this.scene.updateMatrixWorld();

			{
				// adjust scale of components
				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let handlePos = node.getWorldPosition(new THREE.Vector3());
					let distance = handlePos.distanceTo(camera.position);
					let pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);

					let ws = node.parent.getWorldScale(new THREE.Vector3());

					let s = (7 / pr);
					let scale = new THREE.Vector3(s, s, s).divide(ws);

					let rot = new THREE.Matrix4().makeRotationFromEuler(node.rotation);
					let rotInv = new THREE.Matrix4().getInverse(rot);

					scale.applyMatrix4(rotInv);
					scale.x = Math.abs(scale.x);
					scale.y = Math.abs(scale.y);
					scale.z = Math.abs(scale.z);

					node.scale.copy(scale);
				}

				{
					let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
					let raycaster = new THREE.Raycaster(ray.origin, ray.direction);
					let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

					if(intersects.length > 0){
						let I = intersects[0];
						let handleName = I.object.handle;
						this.setActiveHandle(this.handles[handleName]);
					}else{
						this.setActiveHandle(null);
					}
				}

				//
				for(let handleName of Object.keys(this.scaleHandles)){
					let handle = this.handles[handleName];
					let node = handle.node;
					let alignment = handle.alignment;



				}
			}


			{
				let axisScale = (alignment) => {
					let transformed = new THREE.Vector3(...alignment).applyMatrix4(selected.matrixWorld);
					let distance = transformed.distanceTo(selected.getWorldPosition(new THREE.Vector3()));

					return distance;
				};

				let scale = new THREE.Vector3(
					axisScale([1, 0, 0]),
					axisScale([0, 1, 0]),
					axisScale([0, 0, 1]),
				);

			}

		}else{
			this.scene.visible = false;
		}

	}

};

