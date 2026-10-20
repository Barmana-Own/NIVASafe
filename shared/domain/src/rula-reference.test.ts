import { describe, expect, it } from 'vitest';
import { calculateRula, suggestedRulaPostureScore } from './index.js';

// Independent cells from Cornell's February 2001 RULA worksheet, Tables A/B/C.
const neutral = { upperArm:1, lowerArm:1, wrist:1, wristTwist:1, neck:1, trunk:1, legs:1, muscleUse:false, force:0 };
describe('published RULA worksheet scoring', () => {
  it('preserves explicitly tagged historical scores without treating them as table-based results', () => {
    expect(calculateRula({...neutral,algorithmVersion:'legacy-average-v1'}).score).toBe(2);
    expect(calculateRula({...neutral,algorithmVersion:'cornell-worksheet-2001-tables-v1'}).score).toBe(1);
  });
  it('looks up neutral posture in A=1, B=1, C=1 instead of averaging', () => {
    expect(calculateRula(neutral)).toMatchObject({ groupA:1, groupB:1, score:1, actionLevel:1 });
  });
  it('adds force and muscle scores to both table inputs before the C lookup', () => {
    expect([0,1,2,3].map(force=>calculateRula({...neutral,force}).score)).toEqual([1,2,3,4]);
    expect(calculateRula({...neutral,muscleUse:true})).toMatchObject({groupA:2,groupB:2,score:2});
  });
  it('uses independent published non-linear A and B cells', () => {
    expect(calculateRula({...neutral,upperArm:4,lowerArm:1,wrist:3,wristTwist:2,neck:3,trunk:4,legs:2})).toMatchObject({groupA:4,groupB:6,score:6});
    expect(calculateRula({...neutral,upperArm:6,lowerArm:2,wrist:1,wristTwist:1})).toMatchObject({groupA:7,groupB:1,score:5});
  });
  it('saturates only the final C row/column and retains actual A/B values', () => {
    expect(calculateRula({...neutral,upperArm:6,lowerArm:3,wrist:4,wristTwist:2,neck:6,trunk:6,legs:2,muscleUse:true,force:3})).toMatchObject({groupA:13,groupB:13,score:7});
  });
  it('never returns a standard RULA score for an impossible part index', () => {
    for(const invalid of [{legs:3},{wristTwist:3},{wrist:5},{lowerArm:4}]) expect(()=>calculateRula({...neutral,...invalid})).toThrow(RangeError);
  });
  it('keeps base angle bands separate from unobserved posture modifiers', () => {
    expect(suggestedRulaPostureScore('upperArm',150,true)).toBe(4);
    expect(suggestedRulaPostureScore('lowerArm',135,true)).toBe(2);
    expect(suggestedRulaPostureScore('wrist',10,true)).toBe(2);
    expect(suggestedRulaPostureScore('wrist',60,true)).toBe(3);
    expect(suggestedRulaPostureScore('neck',-15,true)).toBe(4);
    expect(suggestedRulaPostureScore('neck',50,true)).toBe(3);
    expect(suggestedRulaPostureScore('trunk',100,true)).toBe(4);
    expect(suggestedRulaPostureScore('legs',90,true,1)).toBe(1);
  });
});
