import React from 'react';
import {createRoot} from 'react-dom/client';
import {StyledSelect} from '../src/components/UI';
import '../src/styles.css';
createRoot(document.getElementById('root')!).render(<main style={{margin:20}}><div className="rula-process-layout"><div className="rula-process-fields"><div className="rula-process-form-grid"><label>عنوان<input/></label><label>سمت بدن<StyledSelect name="bodySide"><option value="RIGHT">سمت راست</option><option value="LEFT">سمت چپ</option><option value="BOTH">هر دو سمت</option></StyledSelect></label></div></div><div>تصویر</div></div></main>);


