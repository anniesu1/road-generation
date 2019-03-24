import { vec2, vec3, vec4, mat4, quat, glMatrix } from 'gl-matrix';
import Turtle from './Turtle';
import ExpansionRule from './ExpansionRule';
import DrawingRule from './DrawingRule';
import ShaderProgram from '../rendering/gl/ShaderProgram';

export default class LSystem {
    highwayTurtle: Turtle = new Turtle(vec3.fromValues(0, 0, 0), 
                                quat.create(), 0); // Current turtle
    roadTurtle: Turtle = new Turtle(vec3.fromValues(0, 0, 0), 
                                quat.create(), 0); // Current turtle
    turtleHistory: Turtle[] = []; // Stack of turtle history
    drawingRules: Map<string, any> = new Map(); // Map of drawing rules
    expansionRules : Map<string, any> = new Map();
    grammar: string;
    numIterations: number;
    rotationAngle: number;
    highwayT: mat4[];
    roadT: mat4[];
    nodes: mat4[];
    edges: mat4[]; // TODO: change
    width: number;
    height: number;
    texture: Uint8Array;

    constructor(axiom: string, numIterations: number, 
                rotationAngle: number, highwayT: mat4[], roadT: mat4[], width: number, height: number, texture: Uint8Array) {
        // Set some member vars
        this.grammar = axiom;
        this.numIterations = numIterations;
        this.rotationAngle = rotationAngle;
        this.highwayT = highwayT;
        this.roadT = roadT;
        this.highwayTurtle = new Turtle(vec3.fromValues(0.0, 0.0, 0.0),
                                 quat.create(), 0);
        this.roadTurtle = new Turtle(vec3.fromValues(0.0, 0.0, 0.0), quat.create(), 0); // TODO: make starting location random
        this.width = width;
        this.height = height;
        this.texture = texture;

        // Set drawing rules
        this.setInitialDrawingRules();

        // Set expansion rules
        let fExpansions = new Map();
        fExpansions.set(.35, "FFL[+FL][-FL][+FL]"); // y direction
        fExpansions.set(.32, "FF[&FL][^FL]"); // z direction
        fExpansions.set(.33, "FF[,FL][/FL]"); // x direction

        let fRule = new ExpansionRule("F", fExpansions);
        this.expansionRules.set("F", fRule);

        let aExpansions = new Map();
        aExpansions.set(1.0, "[&FL!A]/////’[&FL!A]///////’[&FL!A]");
        let aRule = new ExpansionRule("A", aExpansions);
        this.expansionRules.set("A", aRule);
        
        let sExpansions = new Map();
        sExpansions.set(1.0, "FL");
        let sRule = new ExpansionRule("S", sExpansions);
        this.expansionRules.set("S", sRule);
    }

    // createHighway() {
    //     let counter = 0;


    //     while (this.turtleHistory.length != 0) {
    //         if (counter > 150) {
    //             return;
    //         }
    //         counter++;

    //         this.currTurtle = this.turtleHistory.pop();
    //         if (this.first1) {
    //             this.currTurtle.branchNumber = 3;
    //             this.first1 = false;
    //         }
    //         if (this.currTurtle.branchNumber == 1) {
    //             let rotateAmt1 = (120 * Math.random() - 60);
    //             let rotateAmt2 = (120 * Math.random() - 60);
    //             let rotateAmt3 = (120 * Math.random() - 60);


    //             let testTurtle1 = new Turtle(vec3.fromValues(this.currTurtle.position[0], this.currTurtle.position[1], this.currTurtle.position[2]), 
    //                                          vec3.fromValues(this.currTurtle.forward[0], this.currTurtle.forward[1], this.currTurtle.forward[2]), 
    //                                          vec3.fromValues(this.currTurtle.right[0], this.currTurtle.right[1], this.currTurtle.right[2]),
    //                                          this.currTurtle.depth);
    //             let testTurtle2 = new Turtle(vec3.fromValues(this.currTurtle.position[0], this.currTurtle.position[1], this.currTurtle.position[2]), 
    //                                          vec3.fromValues(this.currTurtle.forward[0], this.currTurtle.forward[1], this.currTurtle.forward[2]), 
    //                                          vec3.fromValues(this.currTurtle.right[0], this.currTurtle.right[1], this.currTurtle.right[2]),
    //                                          this.currTurtle.depth);                
                                             
    //             let testTurtle3 = new Turtle(vec3.fromValues(this.currTurtle.position[0], this.currTurtle.position[1], this.currTurtle.position[2]), 
    //                                          vec3.fromValues(this.currTurtle.forward[0], this.currTurtle.forward[1], this.currTurtle.forward[2]), 
    //                                          vec3.fromValues(this.currTurtle.right[0], this.currTurtle.right[1], this.currTurtle.right[2]),
    //                                          this.currTurtle.depth);                
                
    //             testTurtle1.rotate(rotateAmt1);
    //             testTurtle2.rotate(rotateAmt2);
    //             testTurtle3.rotate(rotateAmt3);

    //             testTurtle1.moveForward(0.1);
    //             testTurtle2.moveForward(0.1);
    //             testTurtle3.moveForward(0.1);

    //             let pop1 = this.getPopulation(testTurtle1.position[0], testTurtle1.position[1]);
    //             let pop2 = this.getPopulation(testTurtle2.position[0], testTurtle2.position[1]);
    //             let pop3 = this.getPopulation(testTurtle3.position[0], testTurtle3.position[1]);

    //             if (pop1 > pop2 && pop1 > pop3) {
    //                 this.rotateTurtle(rotateAmt1);  
    //             } else if (pop2 > pop3) {
    //                 this.rotateTurtle(rotateAmt2);  
    //             } else {
    //                 this.rotateTurtle(rotateAmt3);
    //             }
    //             if (this.placeEdge(this.highwayLength + Math.random() * 0.02 - 0.01, 0.005)) {
    //                 this.turtleStack.push(this.currTurtle);
    //             }

    //         } else if (this.currTurtle.branchNumber == 2) {
    //             let theta1 = 60 + (Math.random() * 60 - 30);
    //             let theta2 = -60 + (Math.random() * 60 - 30);

    //             let realTurtle1 = new Turtle(vec3.fromValues(this.currTurtle.position[0], this.currTurtle.position[1], this.currTurtle.position[2]), 
    //                                          vec3.fromValues(this.currTurtle.forward[0], this.currTurtle.forward[1], this.currTurtle.forward[2]), 
    //                                          vec3.fromValues(this.currTurtle.right[0], this.currTurtle.right[1], this.currTurtle.right[2]),
    //                                          this.currTurtle.depth);

    //             let realTurtle2 = new Turtle(vec3.fromValues(this.currTurtle.position[0], this.currTurtle.position[1], this.currTurtle.position[2]), 
    //                                          vec3.fromValues(this.currTurtle.forward[0], this.currTurtle.forward[1], this.currTurtle.forward[2]), 
    //                                          vec3.fromValues(this.currTurtle.right[0], this.currTurtle.right[1], this.currTurtle.right[2]),
    //                                          this.currTurtle.depth);
    //             realTurtle1.rotate(theta1);
    //             realTurtle2.rotate(theta2);

    //             this.currTurtle = realTurtle1;
    //             if (this.placeEdge(this.highwayLength + Math.random() * 0.02 - 0.01, 0.005)) {
    //                 this.turtleStack.push(realTurtle1);
    //             }

    //             this.currTurtle = realTurtle2;
    //             if (this.placeEdge(this.highwayLength + Math.random() * 0.02 - 0.01, 0.005)) {
    //                 this.turtleStack.push(realTurtle2);
    //             }
    //         }
    //     }

            
    // }

    expandSingleChar(char: string) : string {
        // Use the expansion rule(s) that correspond with the given char
        let rule: ExpansionRule;
        rule = this.expansionRules.get(char);
        if (!rule) {
            return char;
        }
        let expansion = rule.expand();
        if (expansion === "") {
            return char;
        }
        return expansion;
    }

    // Iterate over each char in the axiom and replace it with its expansion
    expandGrammar() : string {
        let output = this.grammar;

        for (let i = 0; i < this.numIterations; i++) {
            // Expand [numIterations] number of times
            let currOutput = '';
            for (let j = 0; j < output.length; j++) {
                currOutput += this.expandSingleChar(output.charAt(j));
            }
            output = currOutput;
        }

        this.grammar = output;
        return output;
    }

    setInitialDrawingRules() {
        // let self = this;

        // function popTurtle() {
        //     let poppedTurtle = self.turtleHistory.pop();
        //     self.turtle.writeOver(poppedTurtle);
        // };

        // function pushTurtle() {
        //     let copiedTurtle = self.turtle.makeCopy();
        //     self.turtleHistory.push(copiedTurtle);
        //     self.turtle.depth++;
        // };

        // function turnLeft() {
        //     self.turtle.rotate(self.rotationAngle, 0.0, 0.0);
        // }; // +x

        // function turnRight() {
        //     self.turtle.rotate(-self.rotationAngle, 0.0, 0.0);
        // }; // -x

        // function pitchDown() {
        //     self.turtle.rotate(0.0, self.rotationAngle, 0.0);
        // }; // +y

        // function pitchUp() {
        //     self.turtle.rotate(0.0, -self.rotationAngle, 0.0);
        // }; // -y

        // function rollLeft() {
        //     self.turtle.rotate(0.0, 0.0, self.rotationAngle);
        // }; // +z

        // function rollRight() {
        //     self.turtle.rotate(0.0, 0.0, -self.rotationAngle);
        // }; // -z

        // function turnAround() {
        //     self.turtle.rotate(0.0, Math.PI, 0.0);
        // }; // +y 180 degrees

        // function drawBranch() {
        //     self.turtle.moveForward(0.6 * Math.pow(0.8, self.turtle.depth));
        //     self.branchT.push(self.turtle.getTransformationMatrix("branch"));
        // };

        // function drawLeaf() {
        //     let branchHeight = 3.0 * Math.pow(self.turtle.heightFalloff, self.turtle.depth);
        //     self.turtle.moveForward(branchHeight + 1.2 * Math.pow(0.8, self.turtle.depth));
        //     self.leafT.push(self.turtle.getTransformationMatrix("leaf"));
        // };

        // let popTurtleDR = new DrawingRule(popTurtle.bind(this));
        // let pushTurtleDR = new DrawingRule(pushTurtle.bind(this));
        // let turnLeftDR = new DrawingRule(turnLeft.bind(this)); 
        // let turnRightDR = new DrawingRule(turnRight.bind(this));
        // let pitchDownDR = new DrawingRule(pitchDown.bind(this));
        // let pitchUpDR = new DrawingRule(pitchUp.bind(this));
        // let rollLeftDR = new DrawingRule(rollLeft.bind(this));
        // let rollRightDR = new DrawingRule(rollRight.bind(this));
        // let turnAroundDR = new DrawingRule(turnAround.bind(this));

        // let drawBranchDR = new DrawingRule(drawBranch);
        // let drawLeafDR = new DrawingRule(drawLeaf);

        // this.drawingRules.set("[", pushTurtleDR);
        // this.drawingRules.set("]", popTurtleDR);
        // this.drawingRules.set("+", turnLeftDR);
        // this.drawingRules.set("-", turnRightDR);
        // this.drawingRules.set("&", pitchDownDR);
        // this.drawingRules.set("^", pitchUpDR);
        // this.drawingRules.set(',', rollLeftDR);
        // this.drawingRules.set("/", rollRightDR);
        // this.drawingRules.set("|", turnAroundDR);

        // this.drawingRules.set("F", drawBranchDR);
        // this.drawingRules.set("L", drawLeafDR);
    }


    draw() : void {
        console.log("Grammar to draw: " + this.grammar);
        for (let i = 0; i < this.grammar.length; i++) {
            let currChar = this.grammar.charAt(i);
            let dr = this.drawingRules.get(currChar);
            if (!dr) {
                return;
            }
            let func = dr.drawFunc;
            if (func) {
                func();
            }
        }
    }

    
}