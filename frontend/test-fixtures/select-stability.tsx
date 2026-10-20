import React from 'react';
import { createRoot } from 'react-dom/client';
import { StyledSelect } from '../src/components/UI';
import '../src/styles.css';
const count=Number(new URLSearchParams(location.search).get('count')??6);
const top=Number(new URLSearchParams(location.search).get('top')??450);
createRoot(document.getElementById('root')!).render(<main style={{padding:20,paddingTop:top}}><div style={{width:'min(700px,100%)',minWidth:0}}><StyledSelect name="project" defaultValue="2"><option value="">انتخاب پروژه</option>{Array.from({length:count-2},(_,i)=><option value={String(i)} key={i}>پروژه آزمایشی {i+1}</option>)}<option value="new">+ پروژه جدید</option></StyledSelect></div></main>);
