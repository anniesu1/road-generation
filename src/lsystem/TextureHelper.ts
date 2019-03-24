export default class TextureHelper {
	texture: Uint8Array;

	constructor(texture: Uint8Array) {
		this.texture = texture;
	}

	// Returns value between 0 and 1 for the given x, y texture coordinate for water elevation
	getWater(x: number, y: number) {
		let xpos = Math.floor(x);
    let ypos = Math.floor(y);
    let offset = 0;
    let index = ypos * 2000 * 4 + xpos * 4 + offset;
    return this.texture[index] / 255;
	}

	// Returns value between 0 and 1 for the given x, y texture coordinate for terrain elevation
	getElevation(x: number, y: number) {
		let xpos = Math.floor(x);
    let ypos = Math.floor(y);
    let offset = 1;
    let index = ypos * 2000 * 4 + xpos * 4 + offset;
    return this.texture[index] / 255;
	}

	// Returns value between 0 and 1 for the given x, y texture coordinate for population elevation
	getPopulation(x: number, y: number) {
		let xpos = Math.floor(x);
    let ypos = Math.floor(y);
    let offset = 2;
    let index = ypos * 2000 * 4 + xpos * 4 + offset;
    return this.texture[index] / 255;
	}

}