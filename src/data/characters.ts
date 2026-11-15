export const poses = ['idle','walk','run','jump','fall','land','crouch','block','light','heavy','combo','air','dash','hurt','down','recover','special1','special2','ultimate','death','victory'] as const
export type Pose = typeof poses[number]
export const moveSlots = ['light','heavy','combo','finisher','air','airHeavy','low','lowHeavy','forward','backward','dashAttack','special1','special2','ultimate','combo3','launcher','skillBack','skillUp','skillDown','skillAir','ultimate2','ultimate3'] as const
export type MoveSlot = typeof moveSlots[number]
export interface FighterDefinition {
  id: string
  name: string
  title: string
  role: string
  bio: string
  palette: [string, string, string]
  health: number
  attack: number
  defense: number
  speed: number
  special: number
  difficulty: number
  skills: [string, string, string]
}
export const roster: FighterDefinition[] = [
  {id:'kael',name:'Kael',title:'The Crimson Swordsman',role:'Swordsman',bio:'A banished knight who fights with fast, sweeping sword strikes.',palette:['#512628','#a7443c','#f28a5c'],health:1000,attack:9,defense:5,speed:7,special:7,difficulty:3,skills:['Crimson Slash','Blade Dash','Scarlet Tempest']},
  {id:'ren',name:'Ren',title:'The Shadow Ninja',role:'Assassin',bio:'A courier of the Veil who slips past guards and punishes openings.',palette:['#22343c','#48767d','#a2d0c2'],health:850,attack:6,defense:4,speed:10,special:7,difficulty:7,skills:['Phantom Strike','Shadow Step','Thousand Shadows']},
  {id:'aria',name:'Aria',title:'The Arcane Mage',role:'Mage',bio:'A star-reader who controls space with bolts and a protective ward.',palette:['#362347','#785697','#dbc6f0'],health:900,attack:5,defense:5,speed:6,special:10,difficulty:8,skills:['Arcane Bolt','Mystic Barrier','Celestial Ruin']},
  {id:'darius',name:'Darius',title:'The Iron Guardian',role:'Heavy Fighter',bio:'The last guardian of the gate. His axe turns patience into punishment.',palette:['#373940','#737a85','#e4ba77'],health:1200,attack:10,defense:9,speed:4,special:6,difficulty:5,skills:['Ground Breaker','Iron Guard',"Titan's Judgment"]},
]



