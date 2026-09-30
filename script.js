const registerNames=["AX","BX","CX","DX","SI","DI","BP","SP","CS","DS","ES","SS"];
const flagNames=["CF","ZF","SF","DF"];
const initialRegisters={AX:"18A8",BX:"1234",CX:"9F02",DX:"2CD4",SI:"0020",DI:"125E",BP:"0010",SP:"00E4",IP:"08C2",CS:"11F2",DS:"128D",ES:"128F",SS:"1000",FL:"7A13",CF:"1",PF:"0",AF:"1",ZF:"0",SF:"0",DF:"0",OF:"1"};
const memoryRows=[
["12","23","34","45","56","67","78","89","9A","AB","BC","CD","DE","EF","F0","20"],
["41","42","43","44","45","46","47","48","49","4A","4B","4C","4D","4E","4F","40"],
["51","52","53","54","55","56","57","58","59","5A","5B","5C","5D","5E","5F","50"],
["61","62","63","64","65","66","67","68","69","6A","6B","6C","6D","6E","6F","60"],
["01","02","03","04","05","06","07","08","09","0A","0B","0C","0D","0E","0F","00"],
["11","12","13","14","15","16","17","18","19","1A","1B","1C","1D","1E","1F","10"],
["21","22","23","24","25","26","27","28","29","2A","2B","2C","2D","2E","2F","20"],
["31","32","33","34","35","36","37","38","39","3A","3B","3C","3D","3E","3F","30"]];
const tasks=[
{cmd:"lea di, ds:[si+8h]",r:{DI:"0028"}},
{cmd:"mov al, [di-20]",r:{AX:"1845"}},
{cmd:"movzx ax, al",r:{AX:"0045"}},
{cmd:"mul byte ptr es:[si+2]",r:{AX:"165F"},note:"CF и OF остаются равны 1, поэтому фактически не изменяются."},
{cmd:"cbw",r:{AX:"005F"}},
{cmd:"lodsb",r:{AX:"0051",SI:"0021"}},
{cmd:"xchg bx, si",r:{BX:"0021",SI:"1234"}},
{cmd:"xchg si, [bx]",r:{SI:"5352"},m:{"21":"34","22":"12"}},
{cmd:"sub bx, 30",r:{BX:"0003",CF:"0"},note:"PF = 1 и OF = 0 изменяются внутренне, но этих полей в форме нет."},
{cmd:"xlat",r:{AX:"0055"}},
{cmd:"add ax, es:[bx+2]",r:{AX:"78BC"},note:"PF = 0 и AF = 0 изменяются внутренне, но этих полей в форме нет."},
{cmd:"stosw",r:{DI:"002A"},m:{"28":"BC","29":"78"}},
{cmd:"cwde",r:{},special:"Изменяется только 32-битный EAX: 000078BCh. Доступные поля формы изменять не требуется."},
{cmd:"bswap eax",r:{AX:"0000"},note:"Полное значение EAX = BC780000h; AH = 00h, AL = 00h."},
{cmd:"inc dword ptr ds:[22h]",r:{},m:{"22":"13"}},
{cmd:"cmp ax, bx",r:{CF:"1",SF:"1"},note:"AF также становится 1, но отдельного поля AF в форме нет."},
{cmd:"movsx si, es:[di+8]",r:{SI:"0063"}},
{cmd:"xadd ax, si",r:{AX:"0063",SI:"0000",CF:"0",SF:"0"},note:"PF = 1 и AF = 0 изменяются внутренне."},
{cmd:"cbw",r:{},special:"AL = 63h имеет старший бит 0, поэтому после CBW AX остаётся 0063h. Изменений нет."},
{cmd:"imul byte ptr es:[di+bx-12]",r:{AX:"141C",CF:"1"},note:"OF также становится 1, но отдельного поля OF в форме нет."},
{cmd:"cmpxchg dx, cx",r:{AX:"2CD4"},note:"OF изменяется на 0. После команды: ZF = 0, SF = 1, PF = 1, AF = 0, CF = 1, OF = 0."},
{cmd:"mov cl, es:[12]",r:{CX:"9FDE"}},
{cmd:"sub cl, 75",r:{CX:"9F93",CF:"0"}},
{cmd:"mov cx, 3",r:{CX:"0003"}},
{cmd:"movzx si, cl",r:{SI:"0003"}},
{cmd:"rep movsd",r:{CX:"0000",SI:"000F",DI:"0036"},m:{"2A":"45","2B":"56","2C":"67","2D":"78","2E":"89","2F":"9A","30":"AB","31":"BC","32":"CD","33":"DE","34":"EF","35":"F0"}},
{cmd:"adc word ptr ds:[si], 4",r:{SF:"0"},m:{"0F":"24"}},
{cmd:"cwde",r:{},special:"Изменяется только 32-битный EAX: BC782CD4h → 00002CD4h. Доступные поля формы изменять не требуется."},
{cmd:"movsw",r:{SI:"0011",DI:"0038"},m:{"36":"24","37":"41"}},
{cmd:"les bx, ds:[bx+si+18]",r:{BX:"5857",ES:"78BC"}}
];
let current=0;
function norm(v){return v.trim().toUpperCase().replace(/H$/,'').replace(/^0X/,'');}
function makeInitialMemory(){let h='<div class="memory-area"><table class="initial-memory"><tr><th></th>';for(let c=0;c<16;c++)h+=`<th>${c.toString(16).toUpperCase().padStart(2,'0')}</th>`;h+='</tr>';memoryRows.forEach((row,ri)=>{h+=`<tr><th>${(ri*16).toString(16).toUpperCase().padStart(2,'0')}</th>`;row.forEach(v=>h+=`<td>${v}</td>`);h+='</tr>'});h+='</table></div>';document.getElementById('initialMemory').innerHTML=h}
function makeInitialRegs(){let keys=["AX","BX","CX","DX","SI","DI","BP","SP","IP","CS","DS","ES","SS","FL","CF","PF","AF","ZF","SF","DF","OF"];document.getElementById('initialRegs').innerHTML=keys.map(k=>`<span>${k} = ${initialRegisters[k]}${initialRegisters[k].length>1?'h':''}</span>`).join('')}
function fieldHTML(name,isFlag=false){return `<div class="field ${isFlag?'flag':''}" data-name="${name}"><label>${name} =</label><input maxlength="${isFlag?1:8}" autocomplete="off" spellcheck="false" data-reg="${name}">${isFlag?'':'<span class="suffix">h</span>'}</div>`}
function makeMemoryInputs(){let h='<table class="memory-table"><tr><th></th>';for(let c=0;c<16;c++)h+=`<th>${c.toString(16).toUpperCase().padStart(2,'0')}</th>`;h+='</tr>';for(let r=0;r<8;r++){h+=`<tr><th>${(r*16).toString(16).toUpperCase().padStart(2,'0')}</th>`;for(let c=0;c<16;c++){let a=(r*16+c).toString(16).toUpperCase().padStart(2,'0');h+=`<td data-memcell="${a}"><span class="mem-label">[${a}h]</span><input maxlength="2" data-mem="${a}" autocomplete="off" spellcheck="false"></td>`}h+='</tr>'}return h+'</table>'}
function render(){const t=tasks[current];document.getElementById('taskNum').textContent=`${current+1}/30`;document.getElementById('command').textContent=t.cmd;document.getElementById('progressText').textContent=`Задание ${current+1} из ${tasks.length}`;document.getElementById('registerForm').innerHTML=registerNames.map(x=>fieldHTML(x)).join('')+flagNames.map(x=>fieldHTML(x,true)).join('');document.getElementById('memoryForm').innerHTML=t.m?makeMemoryInputs():'';document.getElementById('message').className='message';document.getElementById('message').textContent='';document.getElementById('prevBtn').disabled=current===0;document.getElementById('nextBtn').disabled=current===tasks.length-1;document.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{i.value=i.value.toUpperCase().replace(/[^0-9A-FXH]/g,'')}))}
function check(){const t=tasks[current];let all=true,required=0;document.querySelectorAll('.field').forEach(f=>{const input=f.querySelector('input'),name=input.dataset.reg,val=norm(input.value);input.classList.remove('correct','wrong','unused');f.classList.remove('checked');if(Object.prototype.hasOwnProperty.call(t.r,name)){required++;f.classList.add('checked');if(val===t.r[name])input.classList.add('correct');else{input.classList.add('wrong');all=false}}else if(val!=='')input.classList.add('unused')});document.querySelectorAll('[data-mem]').forEach(input=>{const a=input.dataset.mem,val=norm(input.value),cell=input.closest('td');input.classList.remove('correct','wrong','unused');cell.classList.remove('checked');if(t.m&&Object.prototype.hasOwnProperty.call(t.m,a)){required++;cell.classList.add('checked');if(val===t.m[a])input.classList.add('correct');else{input.classList.add('wrong');all=false}}else if(val!=='')input.classList.add('unused')});const msg=document.getElementById('message');msg.className='message show';if(t.special){msg.classList.add('success');msg.textContent=t.special;return}if(all){msg.classList.add('success');msg.textContent='Верно. Все изменившиеся доступные поля указаны правильно.'+(t.note?' '+t.note:'')}else{msg.classList.add('error');msg.textContent='Есть ошибка. Красным отмечены проверяемые поля с неверным или отсутствующим значением. Жёлтые поля в этой команде изменять не нужно.'}}
function clearAll(){document.querySelectorAll('.task-card input').forEach(i=>{i.value='';i.classList.remove('correct','wrong','unused')});document.querySelectorAll('.checked').forEach(x=>x.classList.remove('checked'));document.getElementById('message').className='message'}
document.getElementById('checkBtn').onclick=check;document.getElementById('clearBtn').onclick=clearAll;document.getElementById('prevBtn').onclick=()=>{if(current>0){current--;render()}};document.getElementById('nextBtn').onclick=()=>{if(current<tasks.length-1){current++;render()}};makeInitialMemory();makeInitialRegs();render();
