// Numbers with feeling: the island describes its stores in words; the exact figure stays one tap away.
const feelPick=(value,steps)=>steps.find(([limit])=>value<limit)?.[1]??steps.at(-1)[1];
export function feelings(s){
 const pop=Math.max(1,s.population),perHead=s.food/pop;
 return{
  food:feelPick(perHead,[[.5,'De schuren zijn leeg'],[2,'Genoeg voor vandaag'],[6,'Goed gevulde schuren'],[Infinity,'De schuren puilen uit']]),
  wood:feelPick(s.wood,[[10,'Bijna geen hout'],[60,'Een stapel hout'],[300,'Hout voor een vloot'],[Infinity,'Een bos aan planken']]),
  prosperity:feelPick(s.prosperity,[[30,'De gemeente telt haar munten'],[55,'Rondkomen lukt'],[75,'Welvarend'],[Infinity,'Zondagse taart voor iedereen']]),
  water:feelPick(s.freshwater,[[40,'De putten zijn bijna droog'],[70,'Water met mate'],[Infinity,'Fris water genoeg']]),
  environment:feelPick(s.environment,[[40,'Het landschap heeft het zwaar'],[75,'Een landschap met wat zorgen'],[Infinity,'Een levend landschap']])+(s.pollution>20?', er hangt wat rook':''),
  council:`${s.balance.food>=0?'De voorraad groeit':'De voorraad slinkt'} · ${feelPick(s.balance.expenses,[[5,'de gemeente geeft weinig uit'],[40,'de gemeente houdt de boel netjes'],[120,'de gemeente rekent zich suf'],[Infinity,'de gemeentekas zucht hoorbaar']])}`
 };
}
