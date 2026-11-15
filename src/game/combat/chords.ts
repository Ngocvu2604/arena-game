import type {Command} from './engine.ts'
/** Fixed simulation frames, independent of display FPS. */
export const inputTiming={chordFrames:3,bufferFrames:14}
export class ChordBuffer {
 private pending?:{command:Command;age:number;priority:number}
 reset(){this.pending=undefined}
 sample(command:Command):Command{
  const priority=command.move==='ultimate'?3:command.move==='special1'?2:command.move?1:0
  if(priority&&(!this.pending||priority>=this.pending.priority)){
   this.pending={command:{...command},age:0,priority}
  }
  if(this.pending){
   const pending=this.pending
   pending.command.direction=command.direction||pending.command.direction
   pending.command.up=command.up||pending.command.up
   pending.command.crouch=command.crouch||pending.command.crouch
   if(++pending.age>=inputTiming.chordFrames){
    this.pending=undefined
    return {...pending.command,jump:false,dash:false}
   }
   return {direction:command.direction,up:command.up}
  }
  return command
 }
}

