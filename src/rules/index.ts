
import { IRule } from '../types';
import UnusedVariableRule from './unusedVariable';
import UnusedFunctionRule from './unusedFunction';
import MissingReturnRule from './missingReturn';
import InfiniteLoopRule from './infiniteLoop';
import AssignmentInConditionRule from './assignmentInCondition';
import UnreachableCodeRule from './unreachableCode';
import LogicalErrorRule from './logicalError';

const allRules: IRule[] = [
    new UnusedVariableRule(),
    new UnusedFunctionRule(),
    new MissingReturnRule(),
    new InfiniteLoopRule(),
    new AssignmentInConditionRule(),
    new UnreachableCodeRule(),
    new LogicalErrorRule(),
];

export default allRules;
